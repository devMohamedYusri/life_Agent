import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '../../lib/database/notifications';
import ably from '../../lib/ably';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendPushNotification } from '../../lib/web-push';

// Dummy user extraction for demonstration; replace with real auth
async function getUserFromRequest(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }
  return { id: session.user.id };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { data } = await notificationService.getUnread(user.id);
    return NextResponse.json({ notifications: data });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const notificationData = {
      ...body,
      user_id: user.id,
    };
    const { data: newNotification } = await notificationService.create(notificationData);

    if (newNotification) {
      // 1. Publish to Ably for real-time in-app updates
      const channel = ably.channels.get(`notifications:${user.id}`);
      await channel.publish('new-notification', newNotification);

      // 2. Send a web push notification
      const supabase = createRouteHandlerClient({ cookies });
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('subscription_details')
        .eq('user_id', user.id);
      
      if (subscriptions) {
        const pushPayload = {
          title: newNotification.title,
          body: newNotification.message,
          icon: '/icon-192x192.png',
          data: {
            url: `/dashboard` // URL to open on click
          }
        };

        for (const sub of subscriptions) {
          await sendPushNotification(sub.subscription_details, pushPayload);
        }
      }
    }

    return NextResponse.json({ notification: newNotification });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Mark as read (single notification)
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { notificationId } = await req.json();
    const { data } = await notificationService.markAsRead(notificationId);
    return NextResponse.json({ notification: data });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    await notificationService.markAllAsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 