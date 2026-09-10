import { setting } from "./store";
export const isDemo = () => process.env.DEMO_MODE === "true" && setting("live") !== "true";
export function appUrl() { return process.env.APP_URL || "http://127.0.0.1:3000"; }
export function authReady() { return Boolean(process.env.ARENA_CLIENT_ID && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32); }
export function directoryId() { return process.env.ARENA_DIRECTORY_CHANNEL || setting("directory") || ""; }
export function groupId() { const n = Number(process.env.ARENA_GROUP_ID || setting("group")); return Number.isSafeInteger(n) && n > 0 ? n : undefined; }

export function aboutBlockId() { return process.env.ARENA_ABOUT_BLOCK_ID || setting("about") || ""; }
