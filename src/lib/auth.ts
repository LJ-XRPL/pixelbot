import { randomBytes } from 'crypto';
import { db } from './db';
import { agents } from './schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export function generateApiKey(): string {
  return 'pb_' + randomBytes(24).toString('base64url');
}

export function generateClaimToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function authenticateAgent(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKey, apiKey))
    .limit(1);

  return agent || null;
}