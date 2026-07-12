import { cookies } from "next/headers";

const SESSION_COOKIE = "garmin_coach_session";

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

export function sessionCookieOptions(userId: number) {
  return {
    name: SESSION_COOKIE,
    value: String(userId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}
