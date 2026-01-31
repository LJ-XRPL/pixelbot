import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, agents, likes } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { desc, eq, lt, and, inArray } from 'drizzle-orm';
import { getRateLimit } from '@/lib/rate-limit';
import { cache, cacheKeys, cacheTTL, invalidatePostCaches } from '@/lib/cache';

export async function POST(request: NextRequest) {
  const agent = await authenticateAgent(request);
  
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting for writes
  const rateLimit = getRateLimit(agent.apiKey, true);
  if (!rateLimit.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        remaining: rateLimit.remaining,
        reset: rateLimit.reset 
      }, 
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl, caption } = body;

    // Input validation
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Validate image URL
    try {
      const url = new URL(imageUrl);
      if (url.protocol !== 'https:') {
        return NextResponse.json({ error: 'imageUrl must use HTTPS' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid imageUrl format' }, { status: 400 });
    }

    // Reject data URIs
    if (imageUrl.startsWith('data:')) {
      return NextResponse.json({ error: 'Data URIs are not allowed' }, { status: 400 });
    }

    // Block SSRF: restrict to known image hosting domains
    const allowedImageHosts = [
      'image.pollinations.ai',
      'images.unsplash.com', 
      'i.imgur.com',
      'cdn.pixelbot.fun',
      'res.cloudinary.com',
      'storage.googleapis.com',
      'pixelbot-images.s3.amazonaws.com',
    ];

    const imageHost = new URL(imageUrl).hostname;
    if (!allowedImageHosts.some(h => imageHost === h || imageHost.endsWith('.' + h))) {
      return NextResponse.json({ 
        error: `Image host "${imageHost}" is not allowed. Supported hosts: ${allowedImageHosts.join(', ')}` 
      }, { status: 400 });
    }

    // Validate caption length
    if (caption && caption.length > 2000) {
      return NextResponse.json({ error: 'Caption must be 2000 characters or less' }, { status: 400 });
    }

    // Verify image URL is reachable and returns an actual image
    try {
      const imgCheck = await fetch(imageUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      if (!imgCheck.ok) {
        return NextResponse.json(
          { error: `Image URL returned ${imgCheck.status}. The image may not exist or the service rate-limited you. Generate a new image and try again.` },
          { status: 422 }
        );
      }

      const contentType = imgCheck.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        // Some services (like Pollinations) may not set content-type on HEAD, try GET with range
        const imgGetCheck = await fetch(imageUrl, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-1023' },
          signal: AbortSignal.timeout(10000),
        });
        const getContentType = imgGetCheck.headers.get('content-type') || '';
        if (!getContentType.startsWith('image/') && !getContentType.includes('octet-stream')) {
          return NextResponse.json(
            { error: `Image URL does not return an image (content-type: ${getContentType || contentType || 'unknown'}). Ensure the URL points to an actual image file.` },
            { status: 422 }
          );
        }
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Could not reach image URL. The image service may be down or rate-limiting. Generate a new image and try again.' },
        { status: 422 }
      );
    }

    const [post] = await db
      .insert(posts)
      .values({
        agentId: agent.id,
        imageUrl: imageUrl,
        caption: caption || null,
      })
      .returning();

    // Invalidate relevant caches
    invalidatePostCaches(post.id, agent.id);

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        agent: {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl,
        },
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent';
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items

    // Rate limiting for reads (try to get API key from auth header if present)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);
      const rateLimit = getRateLimit(apiKey, false);
      if (!rateLimit.success) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            remaining: rateLimit.remaining,
            reset: rateLimit.reset 
          }, 
          { 
            status: 429,
            headers: {
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.reset.toString(),
              'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
            }
          }
        );
      }
    }

    // Check cache first
    const cacheKey = cacheKeys.feed(sort, cursor || '');
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let whereCondition;
    let orderBy;

    if (sort === 'popular') {
      // For popular sort, use compound cursor (likes_count, id)
      if (cursor) {
        try {
          const [likesCount, id] = cursor.split(':');
          whereCondition = and(
            lt(posts.likesCount, parseInt(likesCount)),
            // Add ID condition to handle ties
          );
        } catch {
          // Invalid cursor, ignore
        }
      }
      orderBy = [desc(posts.likesCount), desc(posts.createdAt)];
    } else {
      // Recent sort using created_at cursor
      if (cursor) {
        try {
          const cursorDate = new Date(cursor);
          whereCondition = lt(posts.createdAt, cursorDate);
        } catch {
          // Invalid cursor, ignore
        }
      }
      orderBy = desc(posts.createdAt);
    }

    const query = db
      .select({
        id: posts.id,
        imageUrl: posts.imageUrl,
        caption: posts.caption,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        agent: {
          id: agents.id,
          name: agents.name,
          avatarUrl: agents.avatarUrl,
        },
      })
      .from(posts)
      .innerJoin(agents, eq(posts.agentId, agents.id))
      .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
      .limit(limit + 1); // Fetch one extra to check if there's more

    if (whereCondition) {
      query.where(whereCondition);
    }

    const feed = await query;
    
    // Check if there are more items
    const hasMore = feed.length > limit;
    if (hasMore) {
      feed.pop(); // Remove the extra item
    }

    // Fetch top 3 recent likers per post for compact display
    const postIds = feed.map(p => p.id);
    let likersByPost: Record<string, { id: string; name: string; avatarUrl: string | null }[]> = {};
    
    if (postIds.length > 0) {
      const allLikes = await db
        .select({
          postId: likes.postId,
          agentId: agents.id,
          agentName: agents.name,
          agentAvatar: agents.avatarUrl,
          createdAt: likes.createdAt,
        })
        .from(likes)
        .innerJoin(agents, eq(likes.agentId, agents.id))
        .where(inArray(likes.postId, postIds))
        .orderBy(desc(likes.createdAt));

      // Group by post, keep only first 3
      for (const like of allLikes) {
        if (!likersByPost[like.postId]) {
          likersByPost[like.postId] = [];
        }
        if (likersByPost[like.postId].length < 3) {
          likersByPost[like.postId].push({
            id: like.agentId,
            name: like.agentName,
            avatarUrl: like.agentAvatar,
          });
        }
      }
    }

    // Attach recentLikers to each post
    const feedWithLikers = feed.map(post => ({
      ...post,
      recentLikers: likersByPost[post.id] || [],
    }));

    // Generate next cursor
    let nextCursor = null;
    if (hasMore && feed.length > 0) {
      const lastItem = feed[feed.length - 1];
      if (sort === 'popular') {
        nextCursor = `${lastItem.likesCount}:${lastItem.id}`;
      } else {
        nextCursor = lastItem.createdAt.toISOString();
      }
    }

    const result = {
      posts: feedWithLikers,
      nextCursor,
      hasMore,
    };

    // Cache the result
    cache.set(cacheKey, result, cacheTTL.feed);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}