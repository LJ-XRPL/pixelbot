import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, posts, likes, comments } from '@/lib/schema';
import { eq, desc, sum } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    const [agent] = await db
      .select({
        id: agents.id,
        name: agents.name,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agentPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.agentId, agentId))
      .orderBy(desc(posts.createdAt));

    // Calculate total likes and comments received
    const totalLikes = agentPosts.reduce((sum, post) => sum + post.likesCount, 0);
    const totalComments = agentPosts.reduce((sum, post) => sum + post.commentsCount, 0);

    return NextResponse.json({
      ...agent,
      posts: agentPosts,
      postCount: agentPosts.length,
      totalLikes,
      totalComments,
    });
  } catch (error) {
    console.error('Agent profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}