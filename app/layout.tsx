import { getSession } from "@/lib/session";
import { Suspense } from "react";
import type { Metadata } from "next";
import { DesktopWindow } from "@/components/desktop-window";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Connections", template: "%s / Connections" }, description: "Meet people through their collections on Are.na." };
async function DesktopLogout() {
  const session = await getSession();
  return session?.token && session.person ? <form className="desktop-logout" action="/api/auth/logout" method="post"><button className="quiet" type="submit">Log out</button></form> : null;
}
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Suspense><DesktopWindow logout={<Suspense><DesktopLogout /></Suspense>}><a className="skip-link" href="#main">Skip to content</a><main id="main">{children}</main></DesktopWindow></Suspense></body></html>; }
