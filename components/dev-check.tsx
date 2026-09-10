"use client";
import { useState } from "react";
export function DevCheck({ pair = false }: { pair?: boolean }) {
  const [result, setResult] = useState<string>(); const [busy, setBusy] = useState(false);
  return <div className="dev-check" aria-busy={busy}><button disabled={busy} onClick={async () => { setBusy(true); try { const r = await fetch(`/api/dev/check${pair ? "?pair=true" : ""}`, { method: "POST" }); setResult(JSON.stringify(await r.json(), null, 2)); } catch { setResult("The check could not complete."); } finally { setBusy(false); } }}>{busy ? "Checking…" : pair ? "Check sharing with jk-testing" : "Run private integration check"}</button>{result && <pre className="small" style={{ whiteSpace: "pre-wrap" }} role="status">{result}</pre>}</div>;
}
