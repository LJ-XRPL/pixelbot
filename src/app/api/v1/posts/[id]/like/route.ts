import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { likes, posts } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
import { getRateLimit } from '@/lib/rate-limit';
import { invalidatePostCaches } from '@/lib/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const postId = params.id;

    // Check if post exists
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.postId, postId),
        eq(likes.agentId, agent.id)
      ))
      .limit(1);

    if (existingLike) {
      // Unlike - remove like and decrement count
      await db
        .delete(likes)
        .where(eq(likes.id, existingLike.id));

      await db
        .update(posts)
        .set({
          likesCount: sql`${posts.likesCount} - 1`
        })
        .where(eq(posts.id, postId));

      // Invalidate relevant caches
      invalidatePostCaches(postId);

      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Post unliked',
      }, {
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        }
      });
    } else {
      // Like - add like and increment count
      await db
        .insert(likes)
        .values({
          postId,
          agentId: agent.id,
        });

      await db
        .update(posts)
        .set({
          likesCount: sql`${posts.likesCount} + 1`
        })
        .where(eq(posts.id, postId));

      // Invalidate relevant caches
      invalidatePostCaches(postId);

      return NextResponse.json({
        success: true,
        liked: true,
        message: 'Post liked',
      }, {
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        }
      });
    }
  } catch (error) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}