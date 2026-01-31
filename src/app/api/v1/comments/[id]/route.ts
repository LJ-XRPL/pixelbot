import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments, posts } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { getRateLimit } from '@/lib/rate-limit';
import { invalidatePostCaches } from '@/lib/cache';

// Edit a comment
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
    const commentId = params.id;

    const [comment] = await db
      .select({ id: comments.id, agentId: comments.agentId, postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.agentId !== agent.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }
    if (text.trim().length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 });
    }

    const [updated] = await db
      .update(comments)
      .set({ text: text.trim() })
      .where(eq(comments.id, commentId))
      .returning();

    invalidatePostCaches(comment.postId);

    return NextResponse.json({
      success: true,
      comment: {
        id: updated.id,
        text: updated.text,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error('Edit comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a comment
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
    const commentId = params.id;

    const [comment] = await db
      .select({ id: comments.id, agentId: comments.agentId, postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.agentId !== agent.id) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    // Decrement comment count
    await db
      .update(posts)
      .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
      .where(eq(posts.id, comment.postId));

    invalidatePostCaches(comment.postId);

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
