import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const skillContent = await readFile(skillPath, 'utf-8');
    
    return new Response(skillContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Skill file error:', error);
    return NextResponse.json({ error: 'Skill file not found' }, { status: 404 });
  }
}