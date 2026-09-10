import { sealData, unsealData } from "iron-session";
import { setting, setSetting } from "./store";
import { ArenaClient } from "./arena";
export async function saveDirectoryCredential(token: string) {
  if (!process.env.SESSION_SECRET) throw new Error("The session secret is missing.");
  setSetting("directory_credential", await sealData({ token }, { password: process.env.SESSION_SECRET, ttl: 0 }));
}
export async function directoryClient(fallbackToken: string) {
  const sealed = setting("directory_credential");
  if (!sealed) return new ArenaClient(fallbackToken);
  const data = await unsealData<{ token?: string }>(sealed, { password: process.env.SESSION_SECRET!, ttl: 0 });
  if (!data.token) throw new Error("The directory account needs to reconnect Are.na in Setup.");
  return new ArenaClient(data.token);
}
export async function directoryToken(fallbackToken: string) {
  const sealed = setting("directory_credential");
  if (!sealed) return fallbackToken;
  const data = await unsealData<{ token?: string }>(sealed, { password: process.env.SESSION_SECRET!, ttl: 0 });
  if (!data.token) throw new Error("The directory account needs to reconnect Are.na in Setup.");
  return data.token;
}
