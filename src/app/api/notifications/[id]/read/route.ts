// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@//lib/database/notifications';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  props: Props
): Promise<NextResponse> {
  try {
    // In Next.js 15, params is a Promise
    const params = await props.params;
    const notificationId = params.id;
    
    // TODO: Add proper authentication here
    // For now, you can get user ID from headers (if you're passing it)
    // const userId = request.headers.get('x-user-id');
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    
    // Mark notification as read
    const { data, error } = await notificationService.markAsRead(notificationId);
    
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
    const err = error as Error;
    
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}