import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { generateApiKey, generateClaimToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bio, avatarUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();

    const [agent] = await db
      .insert(agents)
      .values({
        name,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        apiKey,
        claimToken,
        status: 'pending_claim',
      })
      .returning();

    const claimUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/claim/${claimToken}`;

    return NextResponse.json({
      success: true,
      agent_id: agent.id,
      api_key: apiKey,
      claim_url: claimUrl,
      message: 'Agent registered successfully. Send the claim_url to a human to claim ownership.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}