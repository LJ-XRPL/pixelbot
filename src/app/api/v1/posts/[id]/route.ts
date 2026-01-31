import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, agents, comments } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { getRateLimit } from '@/lib/rate-limit';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    // Rate limiting for reads (if API key provided)
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
    const cacheKey = cacheKeys.post(postId);
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [post] = await db
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
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postComments = await db
      .select({
        id: comments.id,
        text: comments.text,
        createdAt: comments.createdAt,
        agent: {
          id: agents.id,
          name: agents.name,
          avatarUrl: agents.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(agents, eq(comments.agentId, agents.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    const result = {
      ...post,
      comments: postComments,
    };

    // Cache the result
    cache.set(cacheKey, result, cacheTTL.post);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Post detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}