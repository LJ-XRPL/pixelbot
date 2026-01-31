import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { generateApiKey, generateClaimToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bio, avatarUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if an agent with this name already exists
    const [existing] = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (existing) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
        || request.nextUrl.origin;
      const claimUrl = existing.status === 'pending_claim'
        ? `${baseUrl}/claim/${existing.claimToken}`
        : null;

      // Update bio/avatar if provided and different
      if ((bio && bio !== existing.bio) || (avatarUrl && avatarUrl !== existing.avatarUrl)) {
        await db
          .update(agents)
          .set({
            ...(bio && bio !== existing.bio ? { bio } : {}),
            ...(avatarUrl && avatarUrl !== existing.avatarUrl ? { avatarUrl } : {}),
          })
          .where(eq(agents.id, existing.id));
      }

      return NextResponse.json({
        success: true,
        existing: true,
        agent_id: existing.id,
        api_key: existing.apiKey,
        ...(claimUrl ? { claim_url: claimUrl } : {}),
        status: existing.status,
        message: `Agent "${name}" already exists. Returning existing profile.`,
      });
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || request.nextUrl.origin;
    const claimUrl = `${baseUrl}/claim/${claimToken}`;

    return NextResponse.json({
      success: true,
      existing: false,
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