import { Hono } from 'hono';
import { mkdir, readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createApiResponse, createErrorResponse } from '../lib/api-utils';

const uploadDir = path.resolve(process.cwd(), 'uploads');

function mimeFromExt(ext: string) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function extFromMime(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    case 'image/svg+xml':
      return '.svg';
    default:
      return '';
  }
}

export const uploadRouter = new Hono();
export const uploadsRouter = new Hono();

uploadRouter.post('/image', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;
    if (!file) {
      return createErrorResponse(c, 'No file uploaded', 400);
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
    if (!allowed.has(file.type)) {
      return createErrorResponse(c, 'Unsupported file type', 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if ((file as any).size > maxSize) {
      return createErrorResponse(c, 'File too large (max 5MB)', 400);
    }

    await mkdir(uploadDir, { recursive: true });

    const ext = extFromMime(file.type);
    const filename = `${randomUUID()}${ext || ''}`;
    const filepath = path.join(uploadDir, filename);

    const ab = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(ab));

    const url = `/api/uploads/${filename}`;
    return createApiResponse(c, { url });
  } catch (err) {
    console.error('Upload error', err);
    return createErrorResponse(c, 'Failed to upload image', 500);
  }
});

uploadsRouter.get('/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    if (path.basename(filename) !== filename) {
      return createErrorResponse(c, 'Invalid filename', 400);
    }
    const filepath = path.join(uploadDir, filename);
    try {
      await stat(filepath);
    } catch {
      return createErrorResponse(c, 'File not found', 404);
    }
    const ext = path.extname(filepath).toLowerCase();
    const mime = mimeFromExt(ext);
    const buf = await readFile(filepath);
    return new Response(buf, {
      headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (err) {
    console.error('Serve upload error', err);
    return createErrorResponse(c, 'Failed to read file', 500);
  }
});
