import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request);
  
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    bio: agent.bio,
    avatarUrl: agent.avatarUrl,
    status: agent.status,
    claimedBy: agent.claimedBy,
    createdAt: agent.createdAt,
  });
}