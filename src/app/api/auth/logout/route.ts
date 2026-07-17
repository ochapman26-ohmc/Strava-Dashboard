import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  const cookie = clearSessionCookieOptions();
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    maxAge: cookie.maxAge,
    path: cookie.path,
  });
  return response;
}
