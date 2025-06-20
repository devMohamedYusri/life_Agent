import {  NextResponse } from 'next/server';
import { notificationService } from '../../../lib/database/notifications';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Dummy user extraction for demonstration; replace with real auth
async function getUserIdFromRequest() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function POST() {
  try {
    const userId = await getUserIdFromRequest();
    await notificationService.markAllAsRead(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err=error as Error
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 