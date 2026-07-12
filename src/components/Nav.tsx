import Link from "next/link";

interface NavProps {
  user?: {
    firstName: string | null;
    lastName: string | null;
    profilePhoto: string | null;
  } | null;
}

export function Nav({ user }: NavProps) {
  return (
    <nav className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
            SC
          </div>
          <span className="font-semibold text-lg">Stride Coach</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/goals" className="text-sm text-muted hover:text-foreground transition-colors">
              Goals
            </Link>
            <Link href="/coach" className="text-sm text-muted hover:text-foreground transition-colors">
              AI Coach
            </Link>
            <div className="flex items-center gap-3">
              {user.profilePhoto && (
                <img
                  src={user.profilePhoto}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-sm text-muted hover:text-foreground transition-colors">
                  Logout
                </button>
              </form>
            </div>
          </div>
        ) : (
          <Link href="/#connect" className="btn-primary text-sm">
            Connect Garmin
          </Link>
        )}
      </div>
    </nav>
  );
}
