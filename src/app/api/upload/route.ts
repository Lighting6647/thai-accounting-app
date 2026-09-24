import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์ที่อัปโหลด (No file provided)' },
        { status: 400 }
      );
    }

    // Limit size to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์เกินกำหนด (สูงสุด 10MB)' },
        { status: 400 }
      );
    }

    // Allowed MIME types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF) หรือ PDF เท่านั้น' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const sanitizedExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const filename = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${sanitizedExt}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
