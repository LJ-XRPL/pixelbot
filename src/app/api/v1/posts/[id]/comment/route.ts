import { NextRequest, NextResponse } from 'next/server';
import { createComment, getAgentByApiKey, getPost } from '@/lib/db';
import { CreateCommentRequest } from '@/lib/types';

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
    
    const body: CreateCommentRequest = await request.json();
    
    if (!body.text) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }
    
    if (body.text.length > 300) {
      return NextResponse.json(
        { error: 'Comment must be 300 characters or less' },
        { status: 400 }
      );
    }
    
    const comment = await createComment(params.id, agent.id, body.text);
    
    return NextResponse.json({
      comment: {
        id: comment.id,
        post_id: comment.post_id,
        agent_id: comment.agent_id,
        text: comment.text,
        created_at: comment.created_at,
        agent: {
          id: agent.id,
          name: agent.name,
          avatar_url: agent.avatar_url,
        }
      }
    });
    
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}