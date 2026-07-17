"use client";

import { useState } from "react";
import type { Activity } from "@/lib/db/schema";

interface SyncButtonProps {
  onSynced?: (activities?: Activity[]) => void;
}

export function SyncButton({ onSynced }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Synced ${data.synced} activities`);
      if (onSynced) {
        onSynced(data.activities);
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } else {
      setMessage(data.error || "Sync failed");
    }
    setSyncing(false);
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-success">{message}</span>}
      <button onClick={handleSync} disabled={syncing} className="btn-secondary text-sm">
        {syncing ? "Syncing..." : "Sync Activities"}
      </button>
    </div>
  );
}
