import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, agents } from '@/lib/schema';
import { authenticateAgent } from '@/lib/auth';
import { desc, eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const agent = await authenticateAgent(request);
  
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageUrl, caption } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const [post] = await db
      .insert(posts)
      .values({
        agentId: agent.id,
        imageUrl: imageUrl,
        caption: caption || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        agent: {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const orderBy = sort === 'popular' 
      ? desc(posts.likesCount)
      : desc(posts.createdAt);

    const feed = await db
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
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      posts: feed,
      pagination: {
        limit,
        offset,
        hasMore: feed.length === limit,
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}