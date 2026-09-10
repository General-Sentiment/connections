export const isDemo = () => process.env.DEMO_MODE === "true";
export function appUrl() { return process.env.APP_URL || "http://127.0.0.1:3000"; }
export function authReady() { return Boolean(process.env.ARENA_CLIENT_ID && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32); }
export function directoryId() { return profilesChannelId(); }
export function groupId() { const n = Number(process.env.ARENA_GROUP_ID); return Number.isSafeInteger(n) && n > 0 ? n : undefined; }
export function aboutBlockId() { return process.env.ARENA_ABOUT_BLOCK_ID || ""; }
export function profilesChannelId() { return process.env.ARENA_PROFILES_CHANNEL || ""; }
