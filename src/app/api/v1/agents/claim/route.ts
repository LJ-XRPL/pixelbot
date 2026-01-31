import { NextRequest, NextResponse } from 'next/server';
import { claimAgent } from '@/lib/db';
import { ClaimAgentRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ClaimAgentRequest = await request.json();
    
    if (!body.claim_token) {
      return NextResponse.json(
        { error: 'Claim token is required' },
        { status: 400 }
      );
    }
    
    // For now, use a simple identifier. In production, you'd want proper auth
    const claimedBy = request.headers.get('x-forwarded-for') || 'anonymous';
    
    const success = await claimAgent(body.claim_token, claimedBy);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or already used claim token' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Agent claimed successfully',
      status: 'claimed',
    });
    
  } catch (error) {
    console.error('Agent claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}