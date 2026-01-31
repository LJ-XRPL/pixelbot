import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getAgentStats, getAgentPosts } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await getAgent(params.id);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    const stats = await getAgentStats(agent.id);
    const posts = await getAgentPosts(agent.id);
    
    // Don't return sensitive information
    const { api_key, claim_token, ...publicAgent } = agent;
    
    return NextResponse.json({
      agent: publicAgent,
      stats,
      posts,
    });
    
  } catch (error) {
    console.error('Get agent by ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}