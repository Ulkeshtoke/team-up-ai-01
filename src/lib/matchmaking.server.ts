import type { SupabaseClient } from "@supabase/supabase-js";

import {
  coveredSkills,
  rankCandidates,
  templateExplanation,
  type ProjectInput,
  type ScoredCandidate,
} from "./matching";
import { normalizeSkills, SKILL_OPTIONS } from "./taxonomy";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3.7-flash";

async function callAI(messages: { role: string; content: string }[], timeoutMs = 9000) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: AI_MODEL, messages }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** AI-assisted skill extraction with a deterministic keyword fallback. */
export async function extractSkills(description: string): Promise<string[]> {
  const text = description.trim();
  if (!text) return [];

  const raw = await callAI([
    {
      role: "system",
      content: `You extract required technical and non-technical skills from a student project description. Reply with ONLY a JSON array of 3-8 skill names. Prefer names from this list when they apply: ${SKILL_OPTIONS.join(", ")}. Never invent skills that are not implied by the description.`,
    },
    { role: "user", content: text },
  ]);

  const aiSkills = normalizeSkills(parseJsonArray(raw)).slice(0, 8);
  if (aiSkills.length > 0) return aiSkills;

  const lowered = text.toLowerCase();
  return SKILL_OPTIONS.filter((skill) => lowered.includes(skill.toLowerCase())).slice(0, 8);
}

async function aiExplanations(
  project: ProjectInput & { name: string },
  candidates: ScoredCandidate[],
): Promise<Record<string, string>> {
  if (candidates.length === 0) return {};

  const payload = candidates.map((c) => ({
    id: c.profile.id,
    name: c.profile.full_name,
    score: c.score,
    matched_skills: c.breakdown.matchedSkills,
    missing_skills: c.breakdown.missingSkills,
    availability: c.profile.availability,
    hours_per_week: c.profile.hours_per_week,
    experience: c.profile.experience.slice(0, 400),
    interests: c.profile.interests,
  }));

  const raw = await callAI([
    {
      role: "system",
      content:
        'You write one-sentence match explanations for a student team-formation tool. Use ONLY the supplied data. Never invent skills, experience, or availability. Each sentence starts with the score, e.g. "92% match because ...". Reply with ONLY a JSON array of objects: [{"id": "...", "explanation": "..."}].',
    },
    {
      role: "user",
      content: JSON.stringify({
        project: {
          name: project.name,
          description: project.description.slice(0, 600),
          required_skills: project.required_skills,
          preferred_availability: project.preferred_availability,
          preferred_interests: project.preferred_interests,
        },
        candidates: payload,
      }),
    },
  ]);

  if (!raw) return {};
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[0]) as { id?: string; explanation?: string }[];
    const out: Record<string, string> = {};
    for (const item of parsed) {
      if (item?.id && typeof item.explanation === "string" && item.explanation.trim()) {
        out[item.id] = item.explanation.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export type MatchRow = {
  profile_id: string;
  score: number;
  breakdown: ScoredCandidate["breakdown"];
  explanation: string;
  profile: ScoredCandidate["profile"];
};

/** Loads project + candidates, scores deterministically, adds explanations, caches results. */
export async function computeMatches(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<MatchRow[]> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Project not found");
  if (project.owner_id !== userId) throw new Error("Only the project owner can run matching");

  const { data: members } = await supabase
    .from("project_members")
    .select("profile_id, profiles(*)")
    .eq("project_id", projectId);

  const memberProfiles = (members ?? [])
    .map((m: { profiles: unknown }) => m.profiles)
    .filter(Boolean) as { skills: string[] }[];
  const memberIds = new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id));

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
  if (profilesError) throw new Error(profilesError.message);

  const candidates = (profiles ?? []).filter(
    (p: { id: string; user_id: string | null }) => p.user_id !== userId && !memberIds.has(p.id),
  );

  const projectInput: ProjectInput & { name: string } = {
    name: project.name,
    description: project.description ?? "",
    required_skills: project.required_skills ?? [],
    preferred_interests: project.preferred_interests ?? [],
    preferred_availability: project.preferred_availability ?? "medium",
  };

  const ranked = rankCandidates(
    projectInput,
    candidates,
    coveredSkills(projectInput.required_skills, memberProfiles),
    10,
  );

  const explanations = await aiExplanations(projectInput, ranked.slice(0, 5));

  const rows: MatchRow[] = ranked.map((candidate) => ({
    profile_id: candidate.profile.id,
    score: candidate.score,
    breakdown: candidate.breakdown,
    explanation: explanations[candidate.profile.id] ?? templateExplanation(candidate, projectInput),
    profile: candidate.profile,
  }));

  if (rows.length > 0) {
    await supabase.from("matches").delete().eq("project_id", projectId);
    await supabase.from("matches").insert(
      rows.map((row) => ({
        project_id: projectId,
        profile_id: row.profile_id,
        score: row.score,
        breakdown: row.breakdown,
        explanation: row.explanation,
      })),
    );
  }

  return rows;
}
