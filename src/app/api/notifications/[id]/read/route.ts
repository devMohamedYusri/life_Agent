import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '../../../../lib/database/notifications';

// Dummy user extraction for demonstration; replace with real auth
async function getUserIdFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getUserIdFromRequest(req); // Ensure user is authenticated
    const notificationId = params.id;
    const { data } = await notificationService.markAsRead(notificationId);
    return NextResponse.json({ notification: data });
  } catch (error) {
    const err=error as Error
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 