"use client";
import { ProfileVisibility } from "./profile-visibility";
import { PromptPicker } from "./prompt-picker";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { blankDetails, intentions, profileInputSchema, type Details } from "@/lib/details";
import type { Item, Person, Profile } from "@/lib/types";
import { ItemPicker } from "./item-picker";
import { CardFace } from "./card";
import { safeUrl, itemKey } from "@/lib/urls";
import { useWebMCP } from "./use-webmcp";
import { z } from "zod";
import { SelectionPrompt } from "./selection-prompt";
import { fillPrompts, unusedPrompts } from "@/lib/prompt-selection";
import type { ProfilePrompt } from "@/lib/prompts";
import { LocationPicker } from "./location-picker";
export function ProfileForm({ person, profile, demo }: { person: Person; profile?: Profile; demo: boolean }) {
  const [choosingPrompt, setChoosingPrompt] = useState<number>();
  const [step, setStep] = useState(0);
  const wizard = !profile;
  const router = useRouter(); const [whoAreYou, setWhoAreYou] = useState(profile?.whoAreYou || ""); const [lookingFor, setLookingFor] = useState(profile?.lookingFor || ""); const [details, setDetails] = useState<Details>(profile?.details || blankDetails);
  const [selected, setSelected] = useState<Item[]>(profile?.selected || []); const [picker, setPicker] = useState(false); const [replacing, setReplacing] = useState<number>(); const [revealed, setRevealed] = useState<number>(); const [photo, setPhoto] = useState<File>();
  const [useAccountPhoto, setUseAccountPhoto] = useState((!profile?.photo || profile.photo.connection?.metadata?.photo_source === "account") && Boolean(safeUrl(person.avatar)));
  const [photoUrl, setPhotoUrl] = useState(safeUrl(profile?.photo?.image?.medium?.src || profile?.photo?.image?.src || (!profile?.photo ? person.avatar : undefined))); const [removePhoto, setRemovePhoto] = useState(false);
  const [photoProof, setPhotoProof] = useState<string>();
  const [photoKey, setPhotoKey] = useState<string>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [preview, setPreview] = useState(false); const fileInput = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [acceptedCreation, setAcceptedCreation] = useState(false);
  const [dragging, setDragging] = useState<number>();
  const [dropTarget, setDropTarget] = useState<number>();
  const [promptOptions, setPromptOptions] = useState<ProfilePrompt[]>([]);
  const [prompts, setPrompts] = useState<(ProfilePrompt | undefined)[]>(Array.from({ length: Math.max(3, profile?.selected.length || 0) }, (_, i) => profile?.selected[i] && profile.details.selected_prompts?.[itemKey(profile.selected[i])]));
  const [promptError, setPromptError] = useState("");
  const [promptRetry, setPromptRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPromptError("");
    fetch("/api/prompts", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.prompts?.length) throw new Error(data.error || "No prompts are available yet.");
      if (controller.signal.aborted) return;
      setPromptOptions(data.prompts);
      setPrompts(previous => fillPrompts(data.prompts, previous));
      if (fillPrompts(data.prompts, []).filter(Boolean).length < 3) setPromptError("The prompts channel needs at least three different questions.");
    }).catch(error => { if (!controller.signal.aborted) setPromptError(error.message); });
    return () => controller.abort();
  }, [promptRetry]);
  function remix(index: number) {
    setPrompts(previous => {
      const choices = unusedPrompts(promptOptions, previous);
      if (!choices.length) return previous;
      const next = [...previous]; next[index] = choices[Math.floor(Math.random() * choices.length)]; return next;
    });
  }
  const finalStep = 6 + prompts.length;
  function nextStep() {
    const problem = step === 1 && !details.open_to.length ? "Choose at least one intention."
      : step === 2 && (!details.location.city || !details.location.country) ? "Choose your city."
      : step === 4 && !whoAreYou.trim() ? "Tell people who you are."
      : step === 5 && !lookingFor.trim() ? "Tell people what you are looking for."
      : step >= 6 && step < 6 + prompts.length && (!prompts[step - 6] || !selected[step - 6]) ? "Choose a prompt and an item."
      : "";
    if (problem) { setError(problem); return; }
    setError(""); setStep(current => Math.min(finalStep, current + 1));
  }
  const pointerSort = useRef<{ index: number; target: number; x: number; y: number; moved: boolean } | null>(null);
  function reorder(from: number, to: number) {
    if (from !== to) setPrompts(prompts => { const next = [...prompts]; const [prompt] = next.splice(from, 1); next.splice(to, 0, prompt); return next; });
    if (from !== to) setSelected(items => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
    setDragging(undefined); setDropTarget(undefined); setRevealed(undefined);
  }
  const [selectedDescriptions, setSelectedDescriptions] = useState<Record<string, string>>(profile?.selectedDescriptions || {});
  const payload = () => ({ whoAreYou, lookingFor, details, selected: selected.map((x, index) => x && ({ id: x.id, prompt: prompts[index] ? { id: prompts[index]!.id, text: prompts[index]!.text, author: prompts[index]!.author } : undefined, description: selectedDescriptions[itemKey(x)] || "", type: x.type === "Channel" ? "Channel" as const : "Block" as const })).filter(Boolean), photoProof, photoKey, removePhoto, useAccountPhoto });
  useWebMCP([
    { name: "read_profile_draft", description: "Read the profile form currently visible. Does not publish anything.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: input => { z.object({}).strict().parse(input); return { whoAreYou, lookingFor, details, selected: selected.filter(Boolean).map(x => ({ id: x.id, type: x.type, title: x.title })) }; } },
    { name: "stage_profile_description", description: "Replace the looking-for text in the visible profile form. This only stages the draft; it does not save or publish to Are.na.", inputSchema: { type: "object", properties: { text: { type: "string", maxLength: 5000 } }, required: ["text"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { const { text } = z.object({ text: z.string().max(5000) }).strict().parse(input); if (busy || preview) throw new Error("Return to editing before changing the draft."); setLookingFor(text); return { staged: true }; } },
  ]);
  async function deleteCurrentProfile() {
    if (!profile || busy || !window.confirm("Delete your profile? This permanently removes your profile channel from Are.na. This cannot be undone.")) return;
    if (demo) { setError("Profile deletion is unavailable in preview mode."); return; }
    setBusy(true); setDeleting(true); setError("");
    try {
      const response = await fetch("/api/profile", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: profile.channel.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your profile could not be deleted.");
      window.location.replace("/?intro=skip");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your profile could not be deleted.");
      setBusy(false); setDeleting(false);
    }
  }
  async function submit() {
    if (busy) return;
    if (!profile && !acceptedCreation) { setError("Please accept the profile creation note before continuing."); return; }
    if (selected.filter(Boolean).length < 3 || prompts.some((prompt, index) => !prompt || !selected[index])) { setError("Choose at least three prompt-and-item pairs and complete every selection."); return; }
    setError(""); const valid = profileInputSchema.safeParse(payload()); if (!valid.success) { setError(valid.error.issues[0].message); return; }
    if (demo) { setError("This is a preview. Connect the live directory before publishing."); return; }
    setBusy(true);
    try {
      let key = photoKey; let proof = photoProof;
      if (photo && !key) {
        const presign = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: photo.name, contentType: photo.type, size: photo.size }) }); const data = await presign.json(); if (!presign.ok) throw new Error(data.error);
        const uploaded = await fetch(data.upload_url, { method: "PUT", headers: { "Content-Type": data.content_type }, body: photo }); if (!uploaded.ok) throw new Error("The photo could not be uploaded. Try again."); key = data.key; proof = data.proof; setPhotoKey(key); setPhotoProof(proof);
      }
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...valid.data, photoKey: key, photoProof: proof }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error);
      router.push(`/people/${data.channelId}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Your profile could not be saved."); } finally { setBusy(false); }
  }
  return <form noValidate={wizard} data-step={wizard ? step : undefined} className={`profile-editor${wizard ? " profile-wizard" : ""}${busy ? " is-saving" : ""}`} aria-busy={busy} onSubmit={e => { e.preventDefault(); if (wizard && step < finalStep) nextStep(); else void submit(); }}>
    {profile && <ProfileVisibility channelId={profile.channel.id} hidden={profile.channel.metadata?.hidden === true} banner />}
    <fieldset disabled={busy} className="form-fieldset"><div className="profile-fields" inert={busy}>
      <div className="profile-form-grid"><section hidden={wizard && step !== 0} data-profile-step="0"><div className="photo-control"><h3 className="info-title">Your photo</h3><button type="button" className="photo-drop" aria-label={photoUrl ? "Replace photo" : "Add a photo"} disabled={preview} onClick={() => fileInput.current?.click()}>{photoUrl ? <img src={photoUrl} alt="Your profile photo" /> : <span className="photo-plus" aria-hidden>＋</span>}</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setError("Choose a photo smaller than 10 MB."); return; } if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl); setUseAccountPhoto(false); setPhoto(file); setPhotoKey(undefined); setPhotoUrl(URL.createObjectURL(file)); setRemovePhoto(false); }} />{!preview && <div className="photo-buttons"><button type="button" onClick={() => fileInput.current?.click()}>{photoUrl ? "Replace photo" : "Add a photo"}</button>{photoUrl && !useAccountPhoto && <button type="button" onClick={() => { if (photoUrl.startsWith("blob:")) URL.revokeObjectURL(photoUrl); const avatar = safeUrl(person.avatar); setUseAccountPhoto(Boolean(avatar)); setPhoto(undefined); setPhotoUrl(avatar); setPhotoKey(undefined); setRemovePhoto(!avatar); }}>Remove</button>}</div>}<p className="small muted photo-description">We use your Are.na profile photo by default. You can upload a different one.</p></div></section>
      <section className="profile-preferences"><fieldset hidden={wizard && step !== 1} data-profile-step="1" className="intentions"><legend>Open to</legend>{intentions.map(([value, label]) => <label key={value} className="check"><input type="checkbox" disabled={preview} checked={details.open_to.includes(value)} onChange={e => setDetails({ ...details, open_to: e.target.checked ? [...details.open_to, value] : details.open_to.filter(x => x !== value) })} />{label}</label>)}</fieldset><div hidden={wizard && step !== 2} data-profile-step="2">{preview ? <label className="field">City<span>{details.location.city}</span></label> : <LocationPicker value={details.location} onChange={location => setDetails({ ...details, location })} />}</div><fieldset hidden={wizard && step !== 3} data-profile-step="3" className="intentions location-preference"><legend>Where would you like to meet people?</legend><div className="meeting-options">{[{ label: "Local", local: true }, { label: "Anywhere", local: false }].map(option => <label className="check" key={option.label}><input type="radio" name="meeting-location" disabled={preview} checked={details.local_only === option.local} onChange={() => setDetails({ ...details, local_only: option.local })} />{option.label}</label>)}</div></fieldset></section>
      <section hidden={wizard && step !== 4} data-profile-step="4"><h3 className="profile-question-label">Who are you?</h3><textarea aria-label="Who are you?" className="looking-input" placeholder="Tell people a little about yourself…" maxLength={5000} required value={whoAreYou} onChange={e => setWhoAreYou(e.target.value)} /></section>
      <section hidden={wizard && step !== 5} data-profile-step="5"><h3 className="profile-question-label">What are you looking for?</h3>{preview ? <p className="preview-text">{lookingFor}</p> : <textarea aria-label="What are you looking for?" className="looking-input" placeholder="A conversation, a collaborator, something unexpected…" maxLength={5000} required value={lookingFor} onChange={e => setLookingFor(e.target.value)} />}</section>
</div>
      <section className="content-section">{promptError && <p role="alert" className="error">{promptError} <button type="button" className="quiet" onClick={() => setPromptRetry(value => value + 1)}>Retry prompts</button></p>}<div className="grid">{prompts.map((_, i) => <div key={selected[i] ? `${selected[i].type}:${selected[i].id}` : `empty:${i}`} hidden={wizard && step !== 6 + i} data-profile-step={6 + i} data-sort-index={i} className={`selected-slot${dragging === i ? " sorting" : ""}${dropTarget === i && dragging !== i ? " sort-target" : ""}`} draggable={!preview && Boolean(selected[i])} onDragStart={e => { if ((e.target as HTMLElement).closest("textarea")) { e.preventDefault(); return; } setDragging(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }} onDragOver={e => { if (dragging === undefined || !selected[i]) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(i); }} onDrop={e => { e.preventDefault(); if (dragging !== undefined && selected[i]) reorder(dragging, i); }} onDragEnd={() => { setDragging(undefined); setDropTarget(undefined); }}><SelectionPrompt prompt={prompts[i]} onSearch={preview ? undefined : () => setChoosingPrompt(i)} onRemix={preview ? undefined : () => remix(i)} onRemove={!preview && prompts.length > 3 ? () => {
      if (selected[i] && !window.confirm("Remove this prompt and its selected item?")) return;
      setPrompts(current => current.filter((_, index) => index !== i));
      setSelected(current => Array.from({ length: prompts.length }, (_, index) => current[index]).filter((_, index) => index !== i));
      setRevealed(undefined);
    } : undefined} disabled={busy || unusedPrompts(promptOptions, prompts).length === 0} />{selected[i] ? <><div className={`selected-block${revealed === i ? " revealed" : ""}`}><CardFace item={selected[i]} channelTitle={selected[i].type === "Channel" ? <span className="sort-title channel-sort-title" title={preview ? selected[i].title || "" : "Drag to reorder. Use Alt + Up or Down on the keyboard."} tabIndex={preview ? undefined : 0} onKeyDown={e => { if (preview || !e.altKey) return; const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : i; if (to >= 0 && to < selected.length && to !== i) { e.preventDefault(); reorder(i, to); } }} onPointerDown={e => { if (preview || e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointerSort.current = { index: i, target: i, x: e.clientX, y: e.clientY, moved: false }; }} onPointerMove={e => { const sort = pointerSort.current; if (!sort) return; if (Math.hypot(e.clientX - sort.x, e.clientY - sort.y) < 6 && !sort.moved) return; sort.moved = true; setDragging(sort.index); const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-sort-index]"); const target = Number(slot?.dataset.sortIndex); if (slot && selected[target]) { sort.target = target; setDropTarget(target); } }} onPointerUp={() => { const sort = pointerSort.current; pointerSort.current = null; if (sort?.moved) reorder(sort.index, sort.target); }} onPointerCancel={() => { pointerSort.current = null; setDragging(undefined); setDropTarget(undefined); }}>{selected[i].title}</span> : undefined} />{!preview && <><button type="button" className="selected-reveal" aria-label={`Show actions for ${selected[i].title || "block"}`} onClick={() => setRevealed(revealed === i ? undefined : i)} /><button type="button" className="selected-replace" onClick={() => { setReplacing(i); setPicker(true); }}>Replace</button></>}</div><div className="selected-controls">{selected[i].type !== "Channel" && <span className="sort-title" title={preview ? selected[i].title || "" : "Drag to reorder. Use Alt + Up or Down on the keyboard."} tabIndex={preview ? undefined : 0} onKeyDown={e => { if (preview || !e.altKey) return; const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : i; if (to >= 0 && to < selected.length && to !== i) { e.preventDefault(); reorder(i, to); } }} onPointerDown={e => { if (preview || e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointerSort.current = { index: i, target: i, x: e.clientX, y: e.clientY, moved: false }; }} onPointerMove={e => { const sort = pointerSort.current; if (!sort) return; if (Math.hypot(e.clientX - sort.x, e.clientY - sort.y) < 6 && !sort.moved) return; sort.moved = true; setDragging(sort.index); const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-sort-index]"); const target = Number(slot?.dataset.sortIndex); if (slot && selected[target]) { sort.target = target; setDropTarget(target); } }} onPointerUp={() => { const sort = pointerSort.current; pointerSort.current = null; if (sort?.moved) reorder(sort.index, sort.target); }} onPointerCancel={() => { pointerSort.current = null; setDragging(undefined); setDropTarget(undefined); }}>{selected[i].title}</span>}</div><div className="field selected-description-field"><textarea aria-label={`Description for ${selected[i].title || "selected item"}`} maxLength={5000} rows={5} placeholder="Say more?" value={selectedDescriptions[itemKey(selected[i])] || ""} onChange={e => setSelectedDescriptions({ ...selectedDescriptions, [itemKey(selected[i])]: e.target.value })} /></div></> : <button type="button" className="add-square" onClick={() => { setReplacing(i); setPicker(true); }} aria-label={`Choose selected item ${i + 1}`}><span>＋</span><span>Choose a block or channel</span></button>}</div>)}</div><div hidden={wizard && step !== 6 + prompts.length} data-profile-step={6 + prompts.length}>{!preview && <button type="button" className="add-prompt-button" disabled={busy || unusedPrompts(promptOptions, prompts).length === 0} onClick={() => setPrompts(current => { const choices = unusedPrompts(promptOptions, current); return choices.length ? [...current, choices[Math.floor(Math.random() * choices.length)]] : current; })}>Add another block <span aria-hidden="true">＋</span></button>}</div></section>
      </div>{error && <p role="alert" className="notice error">{error}</p>}<div className="form-submit" hidden={wizard && step !== finalStep} data-profile-step={finalStep}>{!profile && <div className="creation-consent"><p className="small muted">Creating your profile creates a public Are.na channel owned by the Connections group. You can edit it through your account. It will be visible on Connections and Are.na. When you connect with someone, your conversation happens in a private Are.na channel shared by the two of you. The Connections group has no access to that channel.</p><label className="check"><input type="checkbox" required checked={acceptedCreation} disabled={busy} onChange={e => setAcceptedCreation(e.target.checked)} /><span>I understand and agree.</span></label></div>}<div>{preview && <button type="button" onClick={() => setPreview(false)}>Back to editing</button>}<button className="profile-primary" type="submit" disabled={busy} aria-live="polite">{deleting ? "Deleting profile…" : busy ? profile ? "Saving profile…" : "Creating profile…" : profile ? "Save profile" : "Create profile"}</button>{profile && <section className="profile-visibility-section" aria-label="Profile visibility"><div className="profile-visibility-buttons"><ProfileVisibility channelId={profile.channel.id} hidden={profile.channel.metadata?.hidden === true} /><button className="delete-profile" type="button" disabled={busy} onClick={() => void deleteCurrentProfile()}>Delete profile</button></div></section>}</div></div>
    </fieldset>{wizard && <nav className="profile-step-nav" aria-label="Profile steps"><button type="button" disabled={busy || step === 0} onClick={() => { setError(""); setStep(current => current - 1); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg>Back</button>{step < finalStep ? <button type="button" className="profile-primary" onClick={nextStep}>Next<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></button> : <span />}</nav>}{picker && replacing !== undefined && <ItemPicker selected={selected.filter((item, i) => item && i !== replacing)} onChange={setSelected} prompt={prompts[replacing]} onRemix={() => remix(replacing)} remixDisabled={unusedPrompts(promptOptions, prompts).length === 0} onReplace={item => { setSelected(current => { const next = current.slice(); next[replacing] = item; return next; }); setPicker(false); setReplacing(undefined); setRevealed(undefined); }} onClose={() => { setPicker(false); setReplacing(undefined); }} />}

    {choosingPrompt !== undefined && <PromptPicker prompts={unusedPrompts(promptOptions, prompts.filter((_, index) => index !== choosingPrompt))} onClose={() => setChoosingPrompt(undefined)} onSelect={prompt => { setPrompts(current => current.map((value, index) => index === choosingPrompt ? prompt : value)); setChoosingPrompt(undefined); }} />}
  </form>;
}
