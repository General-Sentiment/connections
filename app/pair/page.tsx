import { DirectoryHeader } from "@/components/directory-header";
import { MatchPicker } from "@/components/match-picker";
import { Welcome, hasConnection } from "@/components/welcome";
import { getSession } from "@/lib/session";
import { demoPeople } from "@/lib/demo";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PairPage() {
  const demo = isDemo();
  if (!demo && !await hasConnection()) return <Welcome />;
  const session = await getSession();
  const selfId = session?.person?.id ?? (demo ? demoPeople[0].id : undefined);
  return <div className="page"><DirectoryHeader active="pair" /><MatchPicker selfId={selfId} />
    {demo && <p className="preview-note">Preview · Sample profiles.</p>}
  </div>;
}
