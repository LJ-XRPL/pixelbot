import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, posts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

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

    return NextResponse.json({
      ...agent,
      posts: agentPosts,
      postCount: agentPosts.length,
    });
  } catch (error) {
    console.error('Agent profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}