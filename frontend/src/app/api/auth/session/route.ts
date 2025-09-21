import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie) {
    return NextResponse.json({ user: null });
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (new Date(sessionData.expires) < new Date()) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: sessionData.user });
  } catch (error) {
    console.error('Session parsing error:', error);
    return NextResponse.json({ user: null });
  }
}
