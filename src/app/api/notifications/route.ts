import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@//lib/database/notifications';
import ably from '@//lib/ably';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendPushNotification } from '@//lib/web-push';

async function getAuthenticatedUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Unauthorized');
  return session.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await notificationService.getUnread(user.id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const notificationData = {
      ...body,
      user_id: user.id,
    };
    
    const { data: newNotification } = await notificationService.create(notificationData);
    
    // Publish to Ably for real-time updates
    try {
      const channel = ably.channels.get(`notifications:${user.id}`);
      await channel.publish('new-notification', newNotification);
    } catch (ablyError) {
      console.error('Ably publish error:', ablyError);
    }

    // Send web push notification if subscriptions exist
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('subscription_details')
        .eq('user_id', user.id);
      
      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      } else if (subscriptions && subscriptions.length > 0) {
        const pushPayload = {
          title: newNotification.title,
          body: newNotification.message || '',
          icon: '/icon-192x192.png',
          data: {
            url: `/dashboard`,
            notificationId: newNotification.id
          }
        };

        // Send push notifications in parallel
        await Promise.all(
          subscriptions.map(sub => 
            sendPushNotification(sub.subscription_details, pushPayload).catch(err => 
              console.error('Push notification failed:', err)
            )
          )
        );
      }
    } catch (pushError) {
      console.error('Push notification error:', pushError);
    }

    return NextResponse.json({ notification: newNotification });
  } catch (error) {
    console.error('Error creating notification:', error);
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}