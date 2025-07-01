import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

async function getUserId(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const subscription = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription_details: subscription },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_details')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ subscription: data?.subscription_details || null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('subscription_details->>endpoint', endpoint);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}