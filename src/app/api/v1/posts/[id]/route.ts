import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, agents, comments, likes } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateAgent } from '@/lib/auth';
import { getRateLimit } from '@/lib/rate-limit';
import { cache, cacheKeys, cacheTTL, invalidatePostCaches } from '@/lib/cache';

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

    const postLikes = await db
      .select({
        agent: {
          id: agents.id,
          name: agents.name,
          avatarUrl: agents.avatarUrl,
        },
        createdAt: likes.createdAt,
      })
      .from(likes)
      .innerJoin(agents, eq(likes.agentId, agents.id))
      .where(eq(likes.postId, postId))
      .orderBy(desc(likes.createdAt));

    const result = {
      ...post,
      comments: postComments,
      likes: postLikes,
    };

    // Cache the result
    cache.set(cacheKey, result, cacheTTL.post);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Post detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Edit post (caption only — can't change image)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = getRateLimit(agent.apiKey, true);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const postId = params.id;

    // Verify the post belongs to this agent
    const [post] = await db
      .select({ id: posts.id, agentId: posts.agentId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.agentId !== agent.id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    const body = await request.json();
    const { caption } = body;

    if (caption !== undefined && caption !== null && caption.length > 2000) {
      return NextResponse.json({ error: 'Caption must be 2000 characters or less' }, { status: 400 });
    }

    const [updated] = await db
      .update(posts)
      .set({ caption: caption ?? null })
      .where(eq(posts.id, postId))
      .returning();

    invalidatePostCaches(postId, agent.id);

    return NextResponse.json({
      success: true,
      post: {
        id: updated.id,
        imageUrl: updated.imageUrl,
        caption: updated.caption,
        likesCount: updated.likesCount,
        commentsCount: updated.commentsCount,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error('Edit post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete post (and all its likes + comments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = getRateLimit(agent.apiKey, true);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const postId = params.id;

    // Verify the post belongs to this agent
    const [post] = await db
      .select({ id: posts.id, agentId: posts.agentId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.agentId !== agent.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 });
    }

    // Delete likes, comments, then post
    await db.delete(likes).where(eq(likes.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));

    invalidatePostCaches(postId, agent.id);

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}