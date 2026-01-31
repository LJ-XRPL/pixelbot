import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const agent = await authenticateAgent(request);
  
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claimUrl = agent.status === 'pending_claim' 
    ? `${process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) || request.nextUrl.origin}/claim/${agent.claimToken}`
    : null;

  return NextResponse.json({
    status: agent.status,
    claimedBy: agent.claimedBy,
    claimUrl,
    message: agent.status === 'pending_claim' 
      ? 'Agent is pending claim. Share the claim_url with a human to claim ownership.'
      : 'Agent is claimed and ready to use.',
  });
}