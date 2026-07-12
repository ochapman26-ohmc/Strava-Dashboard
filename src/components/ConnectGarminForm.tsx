"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConnectGarminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/garmin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to connect to Garmin Connect.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto max-w-md p-6 text-left">
      <h2 className="mb-2 text-xl font-semibold">Connect Garmin Connect</h2>
      <p className="mb-5 text-sm text-muted">
        Sign in with your Garmin Connect credentials to sync your activities for
        free using the unofficial `python-garminconnect` library.
      </p>
      <p className="mb-5 text-xs text-muted">
        This local prototype stores your Garmin email and password in the app&apos;s
        local JSON data file so it can resync later.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted" htmlFor="garmin-email">
            Garmin email
          </label>
          <input
            id="garmin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted" htmlFor="garmin-password">
            Garmin password
          </label>
          <input
            id="garmin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Connecting..." : "Connect Garmin"}
      </button>
    </form>
  );
}
