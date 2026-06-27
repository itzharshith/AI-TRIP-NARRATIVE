import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';

export async function GET(req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    const { photoId } = await params;
    await db.init();
    
    const photo = await db.getPhotoById(photoId);
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    }

    const imgBuffer = Buffer.from(photo.data as string, 'base64');
    
    // Serve as binary image stream
    return new NextResponse(imgBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': (photo.mimeType as string) || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // cache 1 day
      }
    });

  } catch (err: any) {
    console.error('[photos-single] Serve error:', err);
    return NextResponse.json({ error: 'Could not retrieve photo.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    const { photoId } = await params;
    await db.init();
    await db.deletePhoto(photoId);
    return NextResponse.json({ deleted: true, photoId });
  } catch (err: any) {
    console.error('[photos-single] Delete error:', err);
    return NextResponse.json({ error: 'Could not delete photo.' }, { status: 500 });
  }
}
