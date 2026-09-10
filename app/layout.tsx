import type { Metadata } from "next";
import { DesktopWindow } from "@/components/desktop-window";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Connections", template: "%s / Connections" }, description: "Meet people through their collections on Are.na." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><DesktopWindow><a className="skip-link" href="#main">Skip to content</a><main id="main">{children}</main></DesktopWindow></body></html>; }
