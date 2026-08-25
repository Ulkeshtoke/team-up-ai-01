import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const suggestSkills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { description: string }) => ({
    description: String(input?.description ?? "").slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    const { extractSkills } = await import("./matchmaking.server");
    try {
      return { skills: await extractSkills(data.description), ok: true };
    } catch {
      return { skills: [], ok: false };
    }
  });

export const findMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => ({ projectId: String(input?.projectId ?? "") }))
  .handler(async ({ data, context }) => {
    const { computeMatches } = await import("./matchmaking.server");
    const matches = await computeMatches(context.supabase, context.userId, data.projectId);
    return { matches };
  });
