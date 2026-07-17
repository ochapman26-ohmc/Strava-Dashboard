import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { db, initDb } from "@/lib/db";
import { syncActivities } from "@/lib/activities";

initDb();

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await getAuthenticatedUser(userId);
  if (!user) redirect("/");

  // Vercel instances don't share /tmp — re-sync if this instance has no activities
  try {
    const existing = db.activities.findMany({ userId: user.id });
    if (existing.length === 0) {
      await syncActivities(user);
    }
  } catch {
    // Dashboard can still render empty widgets
  }

  return (
    <>
      <Nav user={user} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DashboardClient userName={user.firstName} />
      </main>
    </>
  );
}
