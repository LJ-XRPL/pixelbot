import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { likes, posts } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await authenticateAgent(request);
  
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Post unliked',
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

      return NextResponse.json({
        success: true,
        liked: true,
        message: 'Post liked',
      });
    }
  } catch (error) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}