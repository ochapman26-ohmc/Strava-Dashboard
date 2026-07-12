import { db } from "./db";

export async function getAuthenticatedUser(userId: number) {
  const user = db.users.findFirst({ id: userId });
  return user ?? null;
}
