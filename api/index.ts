import app from '../server.ts';

export default function handler(req: any, res: any) {
  // Normalize URL for Vercel Serverless Function:
  // If Vercel routes `/api/students` and strips `/api` so `req.url` is `/students`,
  // restore the `/api` prefix so Express routes match correctly.
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/webhook')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
