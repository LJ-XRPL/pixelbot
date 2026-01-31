import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const skillContent = readFileSync(skillPath, 'utf-8');
    
    return new NextResponse(skillContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
    
  } catch (error) {
    console.error('Skill.md read error:', error);
    return NextResponse.json(
      { error: 'Skill.md not found' },
      { status: 404 }
    );
  }
}