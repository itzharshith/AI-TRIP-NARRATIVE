import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';

export async function GET(req: NextRequest, { params }: { params: Promise<{ narrativeId: string }> }) {
  try {
    const { narrativeId } = await params;
    const nId = Number(narrativeId);
    
    if (isNaN(nId)) {
      return NextResponse.json({ error: 'Invalid narrativeId.' }, { status: 400 });
    }

    await db.init();
    const photos = await db.getPhotosByNarrativeId(nId);

    const list = photos.map((p: any) => ({
      photoId:   p.id,
      filename:  p.filename,
      mimeType:  p.mimeType,
      size:      p.size,
      createdAt: p.createdAt,
      url:       `/api/photos/single/${p.id}`,
    }));

    return NextResponse.json({ narrativeId: nId, total: list.length, photos: list });

  } catch (err: any) {
    console.error('[photos-narrative] List error:', err);
    return NextResponse.json({ error: 'Could not retrieve photos.' }, { status: 500 });
  }
}
