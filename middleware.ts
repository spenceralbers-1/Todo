import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = ["/"];
const PASSWORD = process.env.APP_PASSWORD;

export function middleware(request: NextRequest) {
  // If no password is set, do nothing.
  if (!PASSWORD) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("app_auth")?.value;
  if (cookie === PASSWORD) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|unlock).*)"],
};
