export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

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
    const { prompt: userPrompt, destination, mood, style, narrativeId } = body;
    const user = await getAuthenticatedUser(req);
    const userId = user?.uid || null;

    if (!destination && !userPrompt) {
      return NextResponse.json({ error: 'Provide destination or prompt.' }, { status: 400 });
    }

    const genAI = getGenAI();

    // Build a vivid image generation prompt
    const imagePrompt = userPrompt ||
      `A stunning, high-quality travel photograph of ${destination}. ` +
      `${mood ? `Mood: ${mood}. ` : ''}` +
      `${style ? `Style: ${style}. ` : ''}` +
      `Golden hour lighting, vibrant colors, professional travel photography, 8K quality, ` +
      `cinematic composition, sharp focus, no text or watermarks.`;

    console.log(`[ai-photo/generate] Generating image for: "${imagePrompt.slice(0, 80)}..."`);

    // Use Gemini image generation model with fallback
    let result;
    let modelName = 'gemini-3.1-flash-image';
    try {
      console.log(`[ai-photo/generate] Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        } as any,
      });
    } catch (primaryErr: any) {
      console.warn(`[ai-photo/generate] Primary model ${modelName} failed, trying fallback. Error:`, primaryErr.message);
      
      // If primary model failed (e.g. quota, not found, etc.), try the fallback model
      modelName = 'gemini-2.5-flash-image';
      console.log(`[ai-photo/generate] Attempting generation with fallback model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        } as any,
      });
    }

    // Extract the image from the response candidates
    const parts = result.response.candidates?.[0]?.content?.parts || [];
    let imageBase64: string | null = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!imageBase64) {
      console.error('[ai-photo/generate] No image in response.');
      return NextResponse.json({ error: 'AI did not return an image. Try a different prompt.' }, { status: 500 });
    }

    // Save to Turso DB
    await db.init();
    const photoId = await db.insertPhoto({
      narrativeId: narrativeId ? Number(narrativeId) : null,
      userId: userId,
      filename: `ai-generated-${Date.now()}.png`,
      mimeType,
      data: imageBase64,
      size: Math.round(imageBase64.length * 0.75), // approx bytes from base64
    });

    console.log(`[ai-photo/generate] Image generated and saved. photoId=${photoId}`);

    return NextResponse.json({
      photoId,
      imageUrl: `/api/photos/single/${photoId}`,
      dataUrl: `data:${mimeType};base64,${imageBase64}`,
      prompt: imagePrompt,
      mimeType,
    });

  } catch (err: any) {
    console.error('[ai-photo/generate] Error:', err.message);
    if (err.message?.includes('quota') || err.message?.includes('429') || err.message?.includes('Quota')) {
      return NextResponse.json({
        error: 'Image generation quota exceeded. Generating images requires a paid billing account in Google AI Studio or is restricted in your region. Please verify your Gemini API key settings in AI Studio.',
        detail: err.message
      }, { status: 429 });
    }
    if (err.message?.includes('not found') || err.message?.includes('model')) {
      return NextResponse.json({ error: 'Image generation model not available. Try again or use a different prompt.', detail: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: err.message || 'Image generation failed.' }, { status: 500 });
  }
}