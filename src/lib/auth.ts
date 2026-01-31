import { db } from './db';
import { agents } from './schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export function generateApiKey(): string {
  return 'pb_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function generateClaimToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
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