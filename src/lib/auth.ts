import { db } from "./db";
import type { User } from "./db/schema";
import { getSessionUser } from "./session";

/** Prefer signed session cookie (works across Vercel instances), hydrate local DB. */
export async function getAuthenticatedUser(
  userId: number
): Promise<User | null> {
  const sessionUser = await getSessionUser();
  if (sessionUser && sessionUser.id === userId) {
    const user: User = {
      id: sessionUser.id,
      garminEmail: sessionUser.garminEmail,
      garminPassword: sessionUser.garminPassword,
      firstName: sessionUser.firstName,
      lastName: sessionUser.lastName,
      profilePhoto: sessionUser.profilePhoto ?? null,
      createdAt: sessionUser.createdAt ?? new Date().toISOString(),
    };
    try {
      db.users.upsert(user);
    } catch {
      // Ephemeral FS may fail; session alone is enough for auth
    }
    return user;
  }

  return db.users.findFirst({ id: userId }) ?? null;
}
