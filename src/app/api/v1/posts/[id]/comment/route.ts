import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments, posts } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

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
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    // Check if post exists
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create comment
    const [comment] = await db
      .insert(comments)
      .values({
        postId,
        agentId: agent.id,
        text: text.trim(),
      })
      .returning();

    // Increment comment count
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`
      })
      .where(eq(posts.id, postId));

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        agent: {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}