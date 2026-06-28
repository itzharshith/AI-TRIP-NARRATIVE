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
    const { narrativeText, destination, mood, title, driverName, landmarks, highlights } = body;

    if (!narrativeText && !destination) {
      return NextResponse.json({ error: 'Provide narrativeText or destination.' }, { status: 400 });
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
    });

    const contextSnippet = narrativeText ? narrativeText.slice(0, 600) : '';

    const prompt = `You are a viral travel content creator and social media strategist for Manivtha Tours & Travels.

Trip Details:
- Title: ${title || 'Trip to ' + destination}
- Destination: ${destination || 'Unknown'}
- Driver/Guide: ${driverName || 'Manivtha team'}
- Mood: ${mood || 'Adventurous'}
- Landmarks: ${landmarks || 'Various scenic spots'}
- Highlights: ${highlights || 'Amazing scenery and experiences'}
- Narrative excerpt: "${contextSnippet}"

Generate social media content. Return ONLY a JSON object:
{
  "captions": {
    "instagram": "Engaging Instagram caption (100-150 chars, emojis, emotional hook, no hashtags)",
    "twitter": "Punchy Twitter/X post (under 240 chars, wit or insight, one emoji max)",
    "linkedin": "Professional LinkedIn post opening (150-200 chars, storytelling, inspiring)",
    "whatsapp": "Casual WhatsApp status or story caption (60-90 chars, emoji, friendly)"
  },
  "hashtags": ["travel", "manivtha", "roadtrip", "india", "adventure", "wanderlust", "explore", "travelgram", "tripdiaries", "instatravel"],
  "postIdeas": [
    "Short reel idea or story concept #1",
    "Short reel idea or story concept #2",
    "Short reel idea or story concept #3"
  ],
  "bestTime": "Best time to post for maximum engagement (e.g. 'Friday 6-8 PM IST')",
  "viralHook": "A one-liner hook that stops the scroll"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let parsed: any;
    try {
      const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (e: any) {
      console.error('[ai-photo/social-captions] Parse error:', e.message);
      return NextResponse.json({ error: 'Could not parse AI captions.' }, { status: 500 });
    }

    console.log(`[ai-photo/social-captions] Generated for: "${title || destination}"`);
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error('[ai-photo/social-captions] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Caption generation failed.' }, { status: 500 });
  }
}