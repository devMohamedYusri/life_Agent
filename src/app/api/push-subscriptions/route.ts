import { NextRequest, NextResponse } from 'next/server';
import { client } from '../../lib/supabase'; // Adjust path if needed

async function getUserIdFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

// Save a new push subscription for the user
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription object');
    }

    const { error } = await client
      .from('push_subscriptions')
      .insert({ user_id: userId, subscription_details: subscription });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subscription saved.' });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'Failed to save subscription', details: err.message }, { status: 500 });
  }
}

// Get the user's current push subscription
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const { data, error } = await client
      .from('push_subscriptions')
      .select('subscription_details')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ subscription: data ? data.subscription_details : null });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'Failed to retrieve subscription', details: err.message }, { status: 500 });
  }
}

// Delete a user's push subscription
export async function DELETE(req: NextRequest) {
    try {
      const userId = await getUserIdFromRequest(req);
      const { endpoint } = await req.json(); // Identify subscription by endpoint
  
      if (!endpoint) {
        throw new Error('Subscription endpoint is required for deletion.');
      }
  
      const { error } = await client
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('subscription_details->>endpoint', endpoint);
  
      if (error) throw error;
  
      return NextResponse.json({ success: true, message: 'Subscription deleted.' });
    } catch (error) {
      const err = error as Error;
      return NextResponse.json({ error: 'Failed to delete subscription', details: err.message }, { status: 500 });
    }
  } 