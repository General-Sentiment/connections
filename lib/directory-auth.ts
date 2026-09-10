import { unsealData } from "iron-session";
import { ArenaClient } from "./arena";
export async function directoryToken(fallbackToken: string) {
  if (process.env.ARENA_OPERATOR_TOKEN) return process.env.ARENA_OPERATOR_TOKEN;
  const sealed = process.env.ARENA_DIRECTORY_CREDENTIAL;
  if (!sealed) return fallbackToken;
  const data = await unsealData<{ token?: string }>(sealed, { password: process.env.SESSION_SECRET!, ttl: 0 });
  if (!data.token) throw new Error("The configured group credential is invalid. Reconfigure the server's Are.na credential.");
  return data.token;
}
export async function directoryClient(fallbackToken: string) { return new ArenaClient(await directoryToken(fallbackToken)); }
