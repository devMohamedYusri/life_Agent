import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Ably from 'ably';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabaseAuthToken = cookieStore.get('sb-nehzhitiemkaexhybtau-auth-token')?.value;
    
    if (!supabaseAuthToken) {
      console.error('No Supabase auth token found in cookies');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    // Set session from cookie
    const session = JSON.parse(supabaseAuthToken);
    const { data: { user }, error: userError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (userError || !user) {
      console.error('Error setting session or no user:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authenticated user for Ably:', user.id);

    if (!process.env.ABLY_API_KEY) {
      console.error('ABLY_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const ably = new Ably.Rest(process.env.ABLY_API_KEY);
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      capability: {
        [`notifications:${user.id}`]: ['subscribe', 'publish', 'presence'],
        'notifications': ['subscribe'],
      },
      ttl: 3600000,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('Ably auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth token' },
      { status: 500 }
    );
  }
}