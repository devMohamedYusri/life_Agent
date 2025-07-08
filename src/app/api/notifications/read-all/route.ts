import { NextResponse } from 'next/server';
import { notificationService } from '@//lib/database/notifications';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const notificationSvc = notificationService(supabase);
    const { error } = await notificationSvc.markAllAsRead(userId);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark all as read:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}