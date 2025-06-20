// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@//lib/database/notifications';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// // Dummy user extraction for demonstration; replace with real auth
// async function getUserIdFromRequest(): Promise<string> {
//   const supabase = createRouteHandlerClient({ cookies });
//   const { data: { session } } = await supabase.auth.getSession();

//   if (!session || !session.user) {
//     throw new Error('Unauthorized');
//   }
//   return session.user.id;
// }

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Extract params properly
    const { id: notificationId } = context.params;
    
    // Ensure user is authenticated
    // const userId = await getUserIdFromRequest();
    
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
    
    // Return appropriate status code based on error
    const status = err.message === 'Unauthorized' ? 401 : 400;
    
    return NextResponse.json(
      { error: err.message },
      { status }
    );
  }
}