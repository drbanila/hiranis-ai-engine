import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware for Hirani's AI Engine.
 *
 * Vercel's "Protection Bypass for Automation" is primarily enforced by the
 * Vercel platform *before* this middleware runs: when Deployment Protection is
 * enabled, automated clients send the secret in the `x-vercel-protection-bypass`
 * header (optionally with `x-vercel-set-bypass-cookie: true`) and Vercel lets the
 * request through to your app.
 *
 * This middleware recognises that same secret so it can be used to gate any of
 * the app's *own* routes for programmatic access, and so the bypass cookie can be
 * set on demand. By default it is a transparent pass-through — it never blocks
 * normal users. Set `VERCEL_AUTOMATION_BYPASS_SECRET` in your environment (Vercel
 * injects this automatically once you enable Protection Bypass for Automation).
 */
export function middleware(req: NextRequest) {
  const expected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const provided =
    req.headers.get('x-vercel-protection-bypass') ??
    req.nextUrl.searchParams.get('x-vercel-protection-bypass');

  const isAutomated = Boolean(expected) && provided === expected;

  const res = NextResponse.next();

  if (isAutomated) {
    // Mark the request as automation-authenticated for downstream handlers.
    res.headers.set('x-automation-bypass', 'granted');

    // Honour Vercel's opt-in cookie so subsequent requests in the same session
    // also bypass protection without re-sending the secret each time.
    if (req.headers.get('x-vercel-set-bypass-cookie') === 'true') {
      res.cookies.set('vercel-protection-bypass', expected as string, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
    }
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
