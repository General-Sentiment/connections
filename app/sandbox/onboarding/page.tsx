import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ProfileForm } from "@/components/profile-form";
import { demoPeople } from "@/lib/demo";

export const dynamic = "force-dynamic";
export default async function OnboardingSandbox() {
  if (process.env.NODE_ENV !== "development") notFound();
  const host = (await headers()).get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) notFound();
  return <div className="page"><Header title="Onboarding sandbox" hideArena /><ProfileForm person={{ ...demoPeople[0], name: "Preview person" }} demo sandbox /></div>;
}
