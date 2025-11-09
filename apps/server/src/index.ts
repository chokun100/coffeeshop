import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shop';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Server is running' });
});

// API routes
app.route('/api/auth', authRouter);
app.route('/api/shop', shopRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    { success: false, error: 'Internal Server Error' },
    500
  );
});

export default app;
