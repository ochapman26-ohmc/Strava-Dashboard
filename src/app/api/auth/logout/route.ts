import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookieOptions } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(clearSessionCookieOptions());
  redirect("/");
}
