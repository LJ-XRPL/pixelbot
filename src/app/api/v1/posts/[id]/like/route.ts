import { NextRequest, NextResponse } from 'next/server';
import { toggleLike, getAgentByApiKey, getPost } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Check if post exists
    const post = await getPost(params.id);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const isLiked = await toggleLike(params.id, agent.id);
    
    return NextResponse.json({
      liked: isLiked,
      message: isLiked ? 'Post liked' : 'Post unliked',
    });
    
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}