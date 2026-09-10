import Link from "next/link";
import { Header } from "@/components/header";
import { authReady, directoryId, groupId, isDemo } from "@/lib/config";
import { getSession } from "@/lib/session";
import { setting } from "@/lib/store";
import { DevCheck } from "@/components/dev-check";
import { SetupForm } from "@/components/setup-form";
export const dynamic = "force-dynamic";
export default async function Setup() {
  const session = await getSession();
  return <div className="page"><Header title="Setup" actions={process.env.NODE_ENV === "development" && session?.person && directoryId() ? <><DevCheck /><DevCheck pair /></> : undefined} /><div className="notice"><p>Connect Are.na to publish profiles and use private conversations.</p><dl className="rows"><div><dt>OAuth application</dt><dd>{authReady() ? "Configured" : "Not configured"}</dd></div><div><dt>Account</dt><dd>{session?.person?.name || "Not connected"}</dd></div><div><dt>Directory group</dt><dd>{groupId() ? "Configured" : "Not configured"}</dd></div><div><dt>Main channel</dt><dd>{directoryId() ? "Configured" : "Not configured"}</dd></div><div><dt>Mode</dt><dd>{isDemo() ? "Sample preview" : "Live"}</dd></div></dl><p style={{ marginTop: 20 }}>{authReady() ? <Link className="button" href="/api/auth/login?next=/setup">{session?.person ? "Reconnect Are.na" : "Log in with Are.na"} →</Link> : "Add the OAuth client ID and session secret to .env.local to enable login."}</p>{session?.person && (!directoryId() || !setting("directory_credential")) && <SetupForm label={directoryId() ? "Enable group-owned profiles →" : "Create directory channel →"} />}{directoryId() && <Link href="/">Open directory →</Link>}</div><p className="muted">Connections requests read and write access. Your private conversations stay outside the directory group.</p></div>;
}
