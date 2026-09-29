import { draftMode, cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/** Entry from the House's "Preview" button: /api/preview?token=…&path=/about */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const path = url.searchParams.get('path') ?? '/';
  if (!token || !/^\d+\.[\w-]+$/.test(token)) return new Response('Invalid preview link', { status: 401 });
  (await draftMode()).enable();
  (await cookies()).set('rb_preview', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 });
  redirect(path.startsWith('/') && !path.startsWith('//') ? path : '/');
}
