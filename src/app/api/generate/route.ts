export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';
import { buildTravelPrompt } from '@/lib/utils/promptBuilder';

const MIN_WORDS = 200;
const MIN_CHARS = 3000;
const MAX_RETRIES = 3;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured.');
  }
  return new GoogleGenerativeAI(apiKey);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseResponse(raw: string, fallbackRoute: string) {
  let parsed: any;
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonString = jsonMatch ? jsonMatch[1] : raw;
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.error('[generate] Failed to parse JSON response. Falling back to plain text extraction.', e);
    return { 
      title: `${fallbackRoute} — A Journey to Remember`, 
      summary: '',
      socialCaption: '',
      narrative: raw.trim() 
    };
  }

  const title = parsed.title || `${fallbackRoute} — A Journey to Remember`;
  let body = (parsed.narrative || '').trim();

  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  body = body
    .replace(new RegExp(`^#+\\s*${esc}\\s*$`, 'gmi'), '')
    .replace(new RegExp(`^\\*\\*${esc}\\*\\*\\s*$`, 'gmi'), '')
    .replace(new RegExp(`^${esc}\\s*$`, 'gmi'), '')
    .trim();

  body = body.replace(/^##\s+(.+)$/gm, '\n$1\n');

  return { 
    title, 
    summary: parsed.summary || '',
    socialCaption: parsed.socialCaption || '',
    narrative: body 
  };
}

function validateNarrative(text: string) {
  const words = wordCount(text);
  const chars = text.length;
  return { valid: words >= MIN_WORDS && chars >= MIN_CHARS, words, chars };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      driverName, route, startingLocation, destination, title: requestedTitle,
      mood, style, tone, landmarks, highlights, tripDate, vehicleType
    } = body;

    const finalRoute = (startingLocation && destination) ? `${startingLocation} to ${destination}` : route;

    if (!driverName || !finalRoute) {
      return NextResponse.json({ error: 'driverName and route (or startingLocation/destination) are required fields.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 503 });
    }

    // Resolve optional authenticated user ID from cookies
    const user = await getAuthenticatedUser(req);
    const userId = user?.uid || null;

    console.log(`[generate] userId=${userId || 'anonymous'}, route="${finalRoute}", mood="${mood || tone}"`);

    const prompt = buildTravelPrompt({
      driverName, route: finalRoute, startingLocation, destination,
      landmarks, highlights, tripDate, vehicleType, tone, mood, style, title: requestedTitle
    });

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 8192, responseMimeType: "application/json" },
    });

    let lastError: any = null;
    let title = '';
    let narrative = '';
    let summary = '';
    let socialCaption = '';
    let qualityInfo = { valid: false, words: 0, chars: 0 };

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`[generate] Attempt ${attempt}/${MAX_RETRIES + 1}`);
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        console.log(`[generate] Raw length: ${raw.length} chars`);

        const parsed = parseResponse(raw, finalRoute);
        title = parsed.title;
        narrative = parsed.narrative;
        summary = parsed.summary;
        socialCaption = parsed.socialCaption;
        qualityInfo = validateNarrative(narrative);

        console.log(`[generate] Quality — words:${qualityInfo.words}, chars:${qualityInfo.chars}, valid:${qualityInfo.valid}`);

        if (qualityInfo.valid) break;

        console.warn(`[generate] Attempt ${attempt} below quality gate. Retrying…`);
      } catch (err: any) {
        lastError = err;
        console.error(`[generate] Attempt ${attempt} error:`, err.message);
        if (attempt <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }

    if (lastError && !narrative) {
      return NextResponse.json({ error: 'AI generation failed after retries.', detail: lastError.message }, { status: 500 });
    }

    if (!qualityInfo.valid) {
      console.warn(`[generate] Quality gate not met — proceeding with best result.`);
    }

    console.log('[generate] Narrative generation completed');

    try {
      await db.init();
      const id = await db.insertGeneration({
        driverName,
        route: finalRoute,
        startingLocation,
        destination,
        style,
        summary,
        socialCaption,
        landmarks: landmarks || null,
        highlights: highlights || null,
        tripDate: tripDate || null,
        vehicleType: vehicleType || 'Sedan',
        tone: mood || tone || 'Adventurous',
        prompt,
        aiResponse: narrative,
        title,
        userId,
      });

      // Log narrative generation activity
      if (userId) {
        await db.logActivity(userId, 'Create Narrative', `Generated a new narrative: ${title}`);
      }

      return NextResponse.json({
        id,
        title,
        summary,
        socialCaption,
        narrative,
        userId,
        wordCount: qualityInfo.words,
        charCount: qualityInfo.chars,
        createdAt: new Date().toISOString(),
      });

    } catch (dbErr: any) {
      console.error('[generate] Database save error:', dbErr);
      return NextResponse.json({ error: 'Failed to save narrative.', detail: dbErr.message }, { status: 500 });
    }

  } catch (err: any) {
    console.error('[generate] Route error:', err);
    return NextResponse.json({ error: 'Generation failed.', detail: err.message }, { status: 500 });
  }
}
