import { NextRequest, NextResponse } from 'next/server';
import { getAgentByApiKey } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.slice(7); // Remove 'Bearer '
    const agent = await getAgentByApiKey(apiKey);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      status: agent.status,
    });
    
  } catch (error) {
    console.error('Get agent status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}