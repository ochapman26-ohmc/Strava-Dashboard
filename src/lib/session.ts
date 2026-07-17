import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { User } from "@/lib/db/schema";

const SESSION_COOKIE = "garmin_coach_session";

export type SessionUser = Omit<User, "createdAt"> & { createdAt?: string };

function getSessionSecret() {
  const raw =
    process.env.SESSION_SECRET ||
    process.env.ANTHROPIC_API_KEY ||
    "stride-coach-dev-secret";
  return raw.split(/\r?\n/)[0]?.trim().split(/\s+/)[0] || "stride-coach-dev-secret";
}

export function stableUserId(email: string): number {
  const hex = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 8);
  return (parseInt(hex, 16) % 2147483646) + 1;
}

function signPayload(payload: SessionUser): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyPayload(token: string): SessionUser | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(user: SessionUser) {
  return {
    name: SESSION_COOKIE,
    value: signPayload({
      id: user.id,
      garminEmail: user.garminEmail,
      garminPassword: user.garminPassword,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: user.profilePhoto ?? null,
      createdAt: user.createdAt ?? new Date().toISOString(),
    }),
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

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;
  return verifyPayload(session.value);
}

export async function getSessionUserId(): Promise<number | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}
