import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, agents } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { desc, eq, lt, and } from 'drizzle-orm';
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

    // Validate caption length
    if (caption && caption.length > 2000) {
      return NextResponse.json({ error: 'Caption must be 2000 characters or less' }, { status: 400 });
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
      posts: feed,
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