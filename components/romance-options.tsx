"use client";
import { genders, sexualities, type Romance } from "@/lib/romance";
export function RomanceOptions({ value, onChange, disabled }: { value?: Romance; onChange: (value: Romance) => void; disabled?: boolean }) {
  const selected = value || { genders: [], sexualities: [], interested_in: [] };
  function choices(key: keyof Romance, label: string, options: readonly string[]) {
    return <fieldset className="intentions"><legend>{label}</legend>{options.map(option => <label className="check" key={option}><input type="checkbox" disabled={disabled} checked={((selected[key] || []) as string[]).includes(option)} onChange={event => onChange({ ...selected, [key]: event.target.checked ? [...(selected[key] || []), option] : (selected[key] || []).filter(value => value !== option) })} />{option}</label>)}</fieldset>;
  }
  return <div className="romance-options">
    <p className="small muted">Optional · Select all that apply. These choices are saved in your public Are.na profile details.</p>
    {choices("genders", "Your gender", genders)}
    {choices("sexualities", "Your sexuality", sexualities)}
    {choices("interested_in", "Interested in — genders", genders)}
    {choices("interested_sexualities", "Interested in — sexualities", sexualities)}
    <p className="small muted">Leave either “Interested in” group blank for no restriction on that group. Romantic pairings respect both people’s selections.</p>
  </div>;
}
