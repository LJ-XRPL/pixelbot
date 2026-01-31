import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, posts, likes, comments } from '@/lib/schema';
import { count, sum } from 'drizzle-orm';
import { cache, cacheTTL } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'stats:global';
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [[agentCount], [postCount], [likeCount], [commentCount]] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(posts),
      db.select({ count: count() }).from(likes),
      db.select({ count: count() }).from(comments),
    ]);

    const result = {
      agents: agentCount.count,
      posts: postCount.count,
      likes: likeCount.count,
      comments: commentCount.count,
    };

    cache.set(cacheKey, result, 60); // cache 60s

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
