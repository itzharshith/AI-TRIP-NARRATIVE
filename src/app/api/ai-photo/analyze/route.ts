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
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let imagePart: any;
    let destination = '';
    let mood = '';
    let narrative = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('photo') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'Provide a photo file.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      };

      destination = (formData.get('destination') as string) || '';
      mood = (formData.get('mood') as string) || '';
      narrative = (formData.get('narrative') as string) || '';

    } else {
      // JSON body format
      const body = await req.json();
      if (!body.photoUrl) {
        return NextResponse.json({ error: 'Provide a photo file or photoUrl.' }, { status: 400 });
      }

      const response = await fetch(body.photoUrl);
      if (!response.ok) {
        throw new Error('Could not fetch photo from URL');
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      
      imagePart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: response.headers.get('content-type') || 'image/jpeg',
        },
      };

      destination = body.destination || '';
      mood = body.mood || '';
      narrative = body.narrative || '';
    }

    const prompt = `You are a professional travel photographer and social media expert.
Analyze this travel photograph and respond ONLY with a JSON object (no markdown, no code blocks).

Context: ${destination ? `Destination: ${destination}.` : ''} ${mood ? `Trip mood: ${mood}.` : ''} ${narrative ? `Narrative excerpt: "${narrative.slice(0, 200)}"` : ''}

Return this exact JSON structure:
{
  "mood": "one word describing the photo's emotional mood (e.g. Serene, Adventurous, Dramatic, Golden, Misty)",
  "scene": "one sentence describing what is in the photo",
  "suggestedFilter": "one of: none | vivid | warm | cool | bw | vintage | dramatic | fade | golden | matte",
  "brightness": 100,
  "contrast": 100,
  "saturation": 100,
  "captions": {
    "instagram": "Instagram caption (max 150 chars, emojis, no hashtags here)",
    "twitter": "Twitter/X post (max 240 chars, punchy, engaging)",
    "linkedin": "Professional LinkedIn caption (max 200 chars, storytelling tone)",
    "whatsapp": "WhatsApp status (max 100 chars, casual, friendly)"
  },
  "hashtags": ["travel", "roadtrip", "manivtha", "wanderlust", "adventure"],
  "enhancement": "one sentence tip on how to further improve this photo"
}

brightness/contrast/saturation should be integers between 70-150 (100 = no change).
suggestedFilter must be exactly one of the listed options.`;

    const result = await model.generateContent([prompt, imagePart]);
    const raw = result.response.text().trim();

    let parsed: any;
    try {
      const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (e: any) {
      console.error('[ai-photo/analyze] JSON parse error:', e.message, '\nRaw:', raw.slice(0, 300));
      return NextResponse.json({ error: 'AI response could not be parsed.', raw: raw.slice(0, 500) }, { status: 500 });
    }

    console.log(`[ai-photo/analyze] mood=${parsed.mood}, filter=${parsed.suggestedFilter}`);
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error('[ai-photo/analyze] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Analysis failed.' }, { status: 500 });
  }
}