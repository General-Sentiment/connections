import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: Database.Database | undefined;
export function database() {
  if (db) return db;
  const path = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || ".data/connections.sqlite"); mkdirSync(dirname(path), { recursive: true });
  db = new Database(path); db.pragma("journal_mode = WAL"); db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, channel_id INTEGER UNIQUE NOT NULL, published INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS operations (key TEXT PRIMARY KEY, hash TEXT NOT NULL, result TEXT, status TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (key TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations (pair TEXT PRIMARY KEY, channel_id INTEGER UNIQUE NOT NULL, first_id INTEGER NOT NULL, second_id INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS locks (key TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `); return db;
}
export function setting(key: string) { return (database().prepare("SELECT value FROM settings WHERE key=?").get(key) as { value: string } | undefined)?.value; }
export function setSetting(key: string, value: string) { database().prepare("INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value); }
export function profileRef(userId: number) { return database().prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as { user_id: number; channel_id: number; published: number } | undefined; }
export function rememberProfile(userId: number, channelId: number) { database().prepare("INSERT INTO profiles(user_id,channel_id) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET channel_id=excluded.channel_id").run(userId, channelId); }
export function publishProfile(userId: number) { database().prepare("UPDATE profiles SET published=1 WHERE user_id=?").run(userId); }
export function ownerOfProfile(channel: number) { return (database().prepare("SELECT user_id FROM profiles WHERE channel_id=?").get(channel) as { user_id: number } | undefined)?.user_id; }
export async function withLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const take = database().transaction(() => { database().prepare("DELETE FROM locks WHERE key=? AND expires<?").run(key, now); return database().prepare("INSERT OR IGNORE INTO locks VALUES(?,?)").run(key, now + 300000).changes; });
  if (!take()) throw new Error("This change is already being saved. Please wait before trying again.");
  try { return await action(); } finally { database().prepare("DELETE FROM locks WHERE key=?").run(key); }
}
export const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(":");
export type ConversationRef = { pair: string; channel_id: number; first_id: number; second_id: number };
export function conversationRef(a: number, b: number) { return database().prepare("SELECT * FROM conversations WHERE pair=?").get(pairKey(a, b)) as ConversationRef | undefined; }
export function rememberConversation(a: number, b: number, channel: number) { database().prepare("INSERT INTO conversations VALUES(?,?,?,?) ON CONFLICT(pair) DO UPDATE SET channel_id=excluded.channel_id").run(pairKey(a, b), channel, a, b); }
export function conversationRefs(user: number) { return database().prepare("SELECT * FROM conversations WHERE first_id=? OR second_id=?").all(user, user) as ConversationRef[]; }
