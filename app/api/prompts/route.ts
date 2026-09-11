import { profilePrompts } from "@/lib/prompts";
import { apiError, privateJson } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { isDemo } from "@/lib/config";
export async function GET() {
  try {
    if (!isDemo()) await requireSession();
    return privateJson({ prompts: await profilePrompts() });
  } catch (error) { return apiError(error); }
}
