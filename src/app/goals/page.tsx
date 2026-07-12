import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { GoalsClient } from "@/components/GoalsClient";

export default async function GoalsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await getAuthenticatedUser(userId);
  if (!user) redirect("/");

  return (
    <>
      <Nav user={user} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Training Goals</h1>
        <p className="text-muted text-sm mb-8">
          Set goals and track your progress automatically from Garmin data.
        </p>
        <GoalsClient />
      </main>
    </>
  );
}
