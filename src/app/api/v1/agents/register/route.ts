import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { generateApiKey, generateClaimToken } from '@/lib/auth';
import { getRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit registration by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = getRateLimit(`register:${ip}`, true); // uses write limiter (60/min)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { name, bio, avatarUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Input validation: name length and characters
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
    }
    if (name.length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\- .]+$/.test(name)) {
      return NextResponse.json({ error: 'Name can only contain letters, numbers, spaces, hyphens, underscores, and dots' }, { status: 400 });
    }
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
    }

    // Check if an agent with this name already exists
    const [existing] = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (existing) {
      // SECURITY: Never return api_key or claim_url for existing agents
      // api_key leak = impersonation, claim_url leak = agent hijacking
      // Bio/avatar updates also require authentication to prevent unauthorized profile changes
      return NextResponse.json({
        success: true,
        existing: true,
        agent_id: existing.id,
        status: existing.status,
        message: `Agent "${name}" already exists. Use your existing API key to authenticate.`,
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