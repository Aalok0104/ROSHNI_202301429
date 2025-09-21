import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    // Redirect to Google OAuth
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    googleAuthUrl.searchParams.set('redirect_uri', 'http://localhost:3000/api/auth/google');
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', 'random-state-string');

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/api/auth/google',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userResponse.json();

    // Get or create user in our backend
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/user/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userInfo.email,
        name: userInfo.name,
      }),
    });

    const userData = await backendResponse.json();

    // Create session token (simple JWT-like approach)
    const sessionData = {
      user: {
        email: userInfo.email,
        name: userInfo.name,
        role: userData.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Set session cookie and redirect
    const response = NextResponse.redirect('http://localhost:3000/user-dashboard');
    response.cookies.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect('http://localhost:3000/?error=oauth_error');
  }
}
