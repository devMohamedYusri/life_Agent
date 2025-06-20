import { NextRequest, NextResponse } from 'next/server';
import ably from '../../lib/ably';

// Dummy user extraction for demonstration; replace with real auth
async function getUserIdFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) throw new Error('Unauthorized: No user ID provided');
  return userId;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    
    // The client ID for Ably should be the user's ID
    const tokenParams = { clientId: userId };
    
    // Create and sign a token request for the client
    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    
    return NextResponse.json(tokenRequest);
  } catch (error) {
    const err = error as Error;
    console.error('Ably auth error:', err.message);
    return NextResponse.json({ error: 'Ably auth failed', details: err.message }, { status: 500 });
  }
} 