import { draftMode, cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET() {
  (await draftMode()).disable();
  (await cookies()).delete('rb_preview');
  redirect('/');
}
