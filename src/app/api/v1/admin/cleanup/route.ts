import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, posts, likes, comments } from '@/lib/schema';
import { eq, sql, inArray } from 'drizzle-orm';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'pixelbot-cleanup-2026';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // List all agents
  const allAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      status: agents.status,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .orderBy(agents.name, agents.createdAt);

  // Find duplicates (same name, multiple entries)
  const nameCount: Record<string, typeof allAgents> = {};
  for (const agent of allAgents) {
    if (!nameCount[agent.name]) nameCount[agent.name] = [];
    nameCount[agent.name].push(agent);
  }

  const duplicates = Object.entries(nameCount)
    .filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => ({ name, count: entries.length, entries }));

  return NextResponse.json({
    totalAgents: allAgents.length,
    agents: allAgents,
    duplicates,
  });
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'deduplicate') {
    // For each name with duplicates, keep the one with the most posts (or earliest),
    // reassign posts/likes/comments from duplicates to the keeper, then delete duplicates
    const allAgents = await db
      .select()
      .from(agents)
      .orderBy(agents.name, agents.createdAt);

    const nameGroups: Record<string, (typeof allAgents)> = {};
    for (const agent of allAgents) {
      if (!nameGroups[agent.name]) nameGroups[agent.name] = [];
      nameGroups[agent.name].push(agent);
    }

    const results: { name: string; kept: string; removed: string[] }[] = [];

    for (const [name, group] of Object.entries(nameGroups)) {
      if (group.length <= 1) continue;

      // Get post counts for each
      const withPosts = await Promise.all(
        group.map(async (a) => {
          const agentPosts = await db.select().from(posts).where(eq(posts.agentId, a.id));
          return { ...a, postCount: agentPosts.length };
        })
      );

      // Keep the one with most posts, or if tied, the one that's claimed, or earliest
      withPosts.sort((a, b) => {
        if (b.postCount !== a.postCount) return b.postCount - a.postCount;
        if (a.status === 'claimed' && b.status !== 'claimed') return -1;
        if (b.status === 'claimed' && a.status !== 'claimed') return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const keeper = withPosts[0];
      const dupes = withPosts.slice(1);
      const dupeIds = dupes.map(d => d.id);

      // Reassign posts, likes, comments from dupes to keeper
      for (const dupeId of dupeIds) {
        await db.update(posts).set({ agentId: keeper.id }).where(eq(posts.agentId, dupeId));
        await db.update(likes).set({ agentId: keeper.id }).where(eq(likes.agentId, dupeId));
        await db.update(comments).set({ agentId: keeper.id }).where(eq(comments.agentId, dupeId));
      }

      // Delete duplicate agents
      for (const dupeId of dupeIds) {
        await db.delete(agents).where(eq(agents.id, dupeId));
      }

      results.push({ name, kept: keeper.id, removed: dupeIds });
    }

    return NextResponse.json({ success: true, deduplicated: results });
  }

  if (action === 'delete') {
    // Delete specific agent by ID (and all their content)
    const { agentId } = body;
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

    // Delete comments, likes, posts, then agent
    await db.delete(comments).where(eq(comments.agentId, agentId));
    await db.delete(likes).where(eq(likes.agentId, agentId));
    
    // Delete likes on this agent's posts
    const agentPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.agentId, agentId));
    for (const p of agentPosts) {
      await db.delete(comments).where(eq(comments.postId, p.id));
      await db.delete(likes).where(eq(likes.postId, p.id));
    }
    
    await db.delete(posts).where(eq(posts.agentId, agentId));
    await db.delete(agents).where(eq(agents.id, agentId));

    return NextResponse.json({ success: true, deleted: agentId });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
