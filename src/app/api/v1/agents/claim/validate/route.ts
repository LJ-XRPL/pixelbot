import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ valid: false, error: 'no_token' });
    }

    const [agent] = await db
      .select({ name: agents.name, status: agents.status })
      .from(agents)
      .where(eq(agents.claimToken, token))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ valid: false, error: 'not_found' });
    }

    if (agent.status !== 'pending_claim') {
      return NextResponse.json({ valid: false, error: 'already_claimed', agentName: agent.name });
    }

    return NextResponse.json({ valid: true, agentName: agent.name });
  } catch (error) {
    console.error('Validate claim error:', error);
    return NextResponse.json({ valid: false, error: 'server_error' });
  }
}
