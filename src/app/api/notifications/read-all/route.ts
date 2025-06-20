import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '../../../lib/database/notifications';

// Dummy user extraction for demonstration; replace with real auth
async function getUserIdFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    await notificationService.markAllAsRead(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err=error as Error
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 