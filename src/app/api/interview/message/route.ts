import { NextResponse } from 'next/server';
import { mockAIService } from '@/services/ai';
import { AIInterviewState } from '@/types';

/** Server boundary reserved for the future OpenAI integration. The browser must never receive provider secrets. */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string; state?: AIInterviewState };
    if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });
    const state = body.state ?? { step: 0, facts: {}, alreadyAsked: [] };
    return NextResponse.json(mockAIService.reply(body.message, state));
  } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
}
