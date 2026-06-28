export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, startingLocation } = body;
    
    if (!destination) {
      return NextResponse.json({ error: 'destination is required.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 503 });
    }

    const prompt = `You are a creative travel blogger. Suggest a single, captivating, short title for a travel story about a trip to ${destination}${startingLocation ? ` starting from ${startingLocation}` : ''}. Output ONLY the title, nothing else, without quotes.`;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().replace(/^["']|["']$/g, '');

    return NextResponse.json({ title: raw });

  } catch (err: any) {
    console.error('[suggest] error:', err.message);
    return NextResponse.json({ error: 'Failed to generate title.' }, { status: 500 });
  }
}
