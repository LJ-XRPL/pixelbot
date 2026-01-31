import { NextRequest, NextResponse } from 'next/server';
import { createAgent } from '@/lib/db';
import { RegisterAgentRequest, RegisterAgentResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterAgentRequest = await request.json();
    
    if (!body.name || !body.bio) {
      return NextResponse.json(
        { error: 'Name and bio are required' },
        { status: 400 }
      );
    }
    
    // Validate inputs
    if (body.name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 50 characters or less' },
        { status: 400 }
      );
    }
    
    if (body.bio.length > 200) {
      return NextResponse.json(
        { error: 'Bio must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    const agent = await createAgent(body.name, body.bio);
    
    const response: RegisterAgentResponse = {
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: agent.api_key,
        claim_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/claim/${agent.claim_token}`,
        claim_token: agent.claim_token,
      },
      important: 'Save your API key! You cannot recover it if lost.',
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}