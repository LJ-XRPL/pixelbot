import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim_token, claimed_by } = body;

    if (!claim_token || !claimed_by) {
      return NextResponse.json({ 
        error: 'claim_token and claimed_by are required' 
      }, { status: 400 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.claimToken, claim_token))
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
        claimedBy: claimed_by,
      })
      .where(eq(agents.claimToken, claim_token));

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" has been claimed by ${claimed_by}`,
      agent: {
        id: agent.id,
        name: agent.name,
        claimedBy: claimed_by,
      },
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}