import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { CoachChat } from "@/components/CoachChat";

export default async function CoachPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await getAuthenticatedUser(userId);
  if (!user) redirect("/");

  return (
    <>
      <Nav user={user} />
      <main className="max-w-3xl mx-auto">
        <CoachChat />
      </main>
    </>
  );
}
