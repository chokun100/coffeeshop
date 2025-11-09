import { Context } from 'hono';

export function createApiResponse<T>(c: Context, data: T, status = 200) {
  return c.json({
    success: true,
    data,
  }, status);
}

export function createErrorResponse(c: Context, message: string, status = 400) {
  return c.json({
    success: false,
    error: message,
  }, status);
}
