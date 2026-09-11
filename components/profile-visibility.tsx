"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ProfileVisibility({ channelId, hidden, banner = false }: { channelId: number; hidden: boolean; banner?: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter();
  async function change() {
    if (!hidden && !window.confirm("Hide your profile from the Connections listing? Your connections will still be accessible, and your profile will still appear on Are.na in the group.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId, hidden: !hidden }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change profile visibility.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not change visibility."); }
    finally { setBusy(false); }
  }
  if (banner && !hidden) return null;
  return <div className={banner ? "notice profile-hidden-banner" : "profile-visibility-action"}>
    {banner && <p>Your profile is hidden from the Connections listing. Your connections remain accessible, and your profile is still visible on Are.na.</p>}
    <button type="button" className={banner ? "profile-primary" : undefined} disabled={busy} onClick={() => void change()}>{busy ? "Updating…" : hidden ? "Make public" : "Hide profile"}</button>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
