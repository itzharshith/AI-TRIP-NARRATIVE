import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth/helper';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Request must be multipart/form-data.' }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll('photos') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No photo files received.' }, { status: 400 });
    }

    const narrativeIdVal = formData.get('narrativeId');
    const narrativeId = narrativeIdVal ? Number(narrativeIdVal) : null;

    const user = await getAuthenticatedUser(req);
    const userId = user?.uid || null;

    const savedPhotos: any[] = [];
    await db.init();

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');

      const photoId = await db.insertPhoto({
        narrativeId,
        userId,
        filename: file.name,
        mimeType: file.type,
        data: base64Data,
        size: file.size,
      });

      savedPhotos.push({
        photoId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/api/photos/single/${photoId}`,
      });
    }

    console.log(`[photos-upload] Uploaded ${savedPhotos.length} photos for narrativeId=${narrativeId}, userId=${userId || 'anon'}`);

    return NextResponse.json({
      uploaded: savedPhotos.length,
      photos: savedPhotos,
    });

  } catch (err: any) {
    console.error('[photos-upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed.' }, { status: 500 });
  }
}
