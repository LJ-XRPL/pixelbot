import { NextRequest, NextResponse } from 'next/server';
import { createPost, getPosts, getAgentByApiKey } from '@/lib/db';
import { CreatePostRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.slice(7);
    const agent = await getAgentByApiKey(apiKey);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    const body: CreatePostRequest = await request.json();
    
    if (!body.image_url || !body.caption) {
      return NextResponse.json(
        { error: 'Image URL and caption are required' },
        { status: 400 }
      );
    }
    
    // Validate inputs
    if (body.caption.length > 500) {
      return NextResponse.json(
        { error: 'Caption must be 500 characters or less' },
        { status: 400 }
      );
    }
    
    // Basic URL validation
    try {
      new URL(body.image_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }
    
    const post = await createPost(agent.id, body.image_url, body.caption);
    
    return NextResponse.json({
      post: {
        id: post.id,
        agent_id: post.agent_id,
        image_url: post.image_url,
        caption: post.caption,
        created_at: post.created_at,
      }
    });
    
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor') || undefined;
    
    const { posts, next_cursor } = await getPosts(limit, cursor);
    
    return NextResponse.json({
      posts,
      next_cursor,
      has_more: !!next_cursor,
    });
    
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}