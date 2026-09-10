"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Item, Message, Person } from "@/lib/types";
import { Card } from "./card";
import { itemKey } from "@/lib/urls";

function mergeMessages(old: Message[], incoming: Message[]) {
  const result = new Map(old.map(x => [x.id, x]));
  for (const message of incoming) { const prior = result.get(message.id); result.set(message.id, prior ? { ...message, text: message.text || prior.text, attachments: [...new Map([...prior.attachments, ...message.attachments].map(x => [itemKey(x), x])).values()] } : message); }
  return [...result.values()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
}
export function Conversation({ channelId, recipient, self, initialMessages = [], initialNext = null, demo = false }: { channelId?: number; recipient: Person; self: Person; initialMessages?: Message[]; initialNext?: number | null; demo?: boolean }) {
  const router = useRouter(); const [messages, setMessages] = useState(initialMessages); const [next, setNext] = useState(initialNext); const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Item[]>([]); const [url, setUrl] = useState(""); const [attaching, setAttaching] = useState(false); const [busy, setBusy] = useState(false); const [attachmentBusy, setAttachmentBusy] = useState(false); const [error, setError] = useState(""); const [pollError, setPollError] = useState("");
  const requestId = useRef<string>(""); const bottom = useRef<HTMLDivElement>(null); const [olderBusy, setOlderBusy] = useState(false);
  const retryAt = useRef(0);
  const pendingKey = `connections:pending:${self.id}:${recipient.id}`;
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(pendingKey);
      if (!stored) return;
      const pending = JSON.parse(stored);
      if (typeof pending.requestId === "string" && typeof pending.text === "string" && Array.isArray(pending.attachments)) {
        requestId.current = pending.requestId; setText(pending.text); setAttachments(pending.attachments);
      }
    } catch { /* Draft persistence is optional when browser storage is disabled. */ }
  }, [pendingKey]);
  async function refresh(page = 1) {
    if (!channelId || demo || Date.now() < retryAt.current) return;
    const response = await fetch(`/api/conversations/${channelId}?page=${page}`); const data = await response.json(); if (response.status === 429) retryAt.current = Date.now() + (Number(response.headers.get("Retry-After")) || 60) * 1000; if (!response.ok) throw new Error(data.error);
    setMessages(previous => mergeMessages(previous, data.messages)); if (page > 1) setNext(data.next); setPollError("");
  }
  useEffect(() => {
    if (!channelId || demo) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh().catch(e => setPollError(e.message)); }, 20000);
    return () => clearInterval(timer);
  }, [channelId, demo]);
  function changeText(value: string) { setText(value); requestId.current = ""; }
  async function attach(value = url) {
    if (!value.trim()) return; setAttachmentBusy(true); setError("");
    try { const response = await fetch(`/api/items?url=${encodeURIComponent(value)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); const item = data.data[0] as Item; if (!item) throw new Error("Item not found.");
      if (attachments.some(x => itemKey(x) === itemKey(item))) throw new Error("This item is already attached.");
      if (attachments.length >= 6) throw new Error("Attach up to six items per message.");
      setAttachments(old => [...old, item]); setUrl(""); setAttaching(false); requestId.current = "";
    } catch (e) { setError(e instanceof Error ? e.message : "Could not attach this item."); } finally { setAttachmentBusy(false); }
  }
  async function send() {
    if ((!text.trim() && !attachments.length) || busy) return;
    if (demo) { setError("This is a sample conversation. Nothing is sent from preview mode."); return; }
    setBusy(true); setError(""); requestId.current ||= crypto.randomUUID();
    const message = { requestId: requestId.current, text, attachments: attachments.map(x => ({ id: x.id, type: x.type === "Channel" ? "Channel" : "Block" })) };
    try {
      try { sessionStorage.setItem(pendingKey, JSON.stringify({ requestId: requestId.current, text, attachments })); } catch {}
      const response = await fetch(channelId ? `/api/conversations/${channelId}` : "/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(channelId ? message : { personId: recipient.id, message }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error);
      try { sessionStorage.removeItem(pendingKey); } catch {}
      setText(""); setAttachments([]); requestId.current = "";
      if (!channelId) { router.replace(`/connections/${data.channelId}`); router.refresh(); }
      else { await refresh(); setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50); }
    } catch (e) { setError(e instanceof Error ? e.message : "Your reply could not be sent."); } finally { setBusy(false); }
  }
  return <div className="conversation"><div className="thread"><p className="privacy-note">Only you and {recipient.name} {channelId ? "have" : "will have"} access to this private channel on Are.na. The Connections group is not a collaborator.</p>{next && <button disabled={olderBusy} className="quiet" onClick={async () => { setOlderBusy(true); try { await refresh(next); } catch (e) { setError(e instanceof Error ? e.message : "Could not load earlier messages."); } finally { setOlderBusy(false); } }}>{olderBusy ? "Loading…" : "Load earlier messages"}</button>}
    {!messages.length && <p className="first-message">Start a conversation with {recipient.name}.</p>}
    {messages.map(message => <article className={`message ${message.sender.id === self.id ? "own" : ""}`} key={message.id}><div className="message-byline"><strong>{message.sender.name}</strong><time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</time></div>{message.text && <div className="message-text"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{message.text}</ReactMarkdown></div>}{message.attachments.length > 0 && <div className="message-attachments">{message.attachments.map(item => <Card key={itemKey(item)} item={item} />)}</div>}</article>)}<div ref={bottom} />{pollError && <p role="status" className="small muted">{pollError}</p>}</div>
    <form aria-busy={busy || attaching} className="composer" onSubmit={e => { e.preventDefault(); void send(); }}><fieldset disabled={busy} className="form-fieldset">{attachments.length > 0 && <div className="draft-attachments">{attachments.map(item => <div key={itemKey(item)}><span>{item.title || "Untitled"}</span><button type="button" className="quiet" aria-label={`Remove ${item.title}`} onClick={() => { setAttachments(attachments.filter(x => itemKey(x) !== itemKey(item))); requestId.current = ""; }}>×</button></div>)}</div>}
      <textarea aria-label="Write a reply" placeholder="Write a reply…" maxLength={10000} value={text} onChange={e => changeText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} onPaste={e => { const value = e.clipboardData.getData("text").trim(); if (/^https:\/\/(www\.)?are\.na\//.test(value) && !value.includes("\n")) { e.preventDefault(); setUrl(value); setAttaching(true); } }} />
      {attaching && <div className="attachment-input"><input autoFocus type="url" aria-label="Are.na attachment URL" placeholder="https://www.are.na/…" value={url} onChange={e => setUrl(e.target.value)} /><button type="button" disabled={attachmentBusy || !url} onClick={() => void attach()}>{attachmentBusy ? "Loading…" : "Attach"}</button><button type="button" className="icon" aria-label="Cancel attachment" onClick={() => setAttaching(false)}>×</button></div>}
      {error && <p role="alert" className="error small">{error}</p>}<div className="composer-actions"><button type="button" className="icon quiet" aria-label="Attach a block or channel" onClick={() => setAttaching(!attaching)}>＋</button><button type="submit" disabled={busy || attachmentBusy || (!text.trim() && !attachments.length)}>{busy ? "Sending…" : "Send"}</button></div>
    </fieldset></form>{demo && <p className="preview-note">Sample conversation · Messages are not sent.</p>}
  </div>;
}
