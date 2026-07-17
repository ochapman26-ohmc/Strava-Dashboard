import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await getAuthenticatedUser(userId);
  if (!user) redirect("/");

  return (
    <>
      <Nav user={user} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DashboardClient userName={user.firstName} />
      </main>
    </>
  );
}
