export const normalizeParticipantName = (name: string) => name.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\s+/g, " ");
export const normalizeParticipantCode = (code: string) => code.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
