import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent, generateApiKey } from '@/lib/auth';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  const agent = await authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.action === 'rotate_key') {
      const newKey = generateApiKey();
      await db.update(agents).set({ apiKey: newKey }).where(eq(agents.id, agent.id));
      return NextResponse.json({ 
        success: true, 
        api_key: newKey, 
        message: 'API key rotated. Old key is now invalid.' 
      });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Agent action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}