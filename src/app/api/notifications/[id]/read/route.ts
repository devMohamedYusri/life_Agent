import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@//lib/database/notifications';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  props: Props
): Promise<NextResponse> {
  try {
    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // In Next.js 15, params is a Promise
    const params = await props.params;
    const notificationId = params.id;
    
    // Create notification service instance with supabase client
    const notificationSvc = notificationService(supabase);
    
    // Verify the notification belongs to the user before marking as read
    const { data: notification, error: fetchError } = await notificationSvc.getById(notificationId);
    
    if (fetchError || !notification || notification.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Mark notification as read
    const { data, error } = await notificationSvc.markAsRead(notificationId);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      notification: data 
    });
    
  } catch (error) {
    console.error('Error in mark as read:', error);
    const err = error as Error;
    
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}