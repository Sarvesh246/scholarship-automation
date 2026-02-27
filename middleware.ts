import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIX = "/app/";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(PROTECTED_PREFIX)) {
    const hasAuthCookie = request.cookies.get("auth")?.value === "1";

    if (!hasAuthCookie) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"]
};

