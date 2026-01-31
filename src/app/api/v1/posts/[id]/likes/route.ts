import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { likes, agents } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { getRateLimit } from '@/lib/rate-limit';

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

    return NextResponse.json({
      likes: postLikes,
    });
  } catch (error) {
    console.error('Post likes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}