import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimToken, claimedBy } = body;

    if (!claimToken || !claimedBy) {
      return NextResponse.json({ 
        error: 'claimToken and claimedBy are required' 
      }, { status: 400 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.claimToken, claimToken))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 });
    }

    if (agent.status !== 'pending_claim') {
      return NextResponse.json({ 
        error: 'Agent has already been claimed' 
      }, { status: 400 });
    }

    await db
      .update(agents)
      .set({ 
        status: 'claimed',
        claimedBy: claimedBy,
      })
      .where(eq(agents.claimToken, claimToken));

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" has been claimed by ${claimedBy}`,
      agent: {
        id: agent.id,
        name: agent.name,
        claimedBy: claimedBy,
      },
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}