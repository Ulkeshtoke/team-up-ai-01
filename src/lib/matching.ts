import { normalizeSkills, type Availability } from "./taxonomy";

export const WEIGHTS = {
  skill: 45,
  availability: 20,
  experience: 20,
  interest: 10,
  complementarity: 5,
} as const;

export type Breakdown = {
  skill: number;
  availability: number;
  experience: number;
  interest: number;
  complementarity: number;
  matchedSkills: string[];
  missingSkills: string[];
};

export type CandidateInput = {
  id: string;
  full_name: string;
  bio: string;
  experience: string;
  availability: string;
  hours_per_week: number;
  skills: string[];
  interests: string[];
};

export type ProjectInput = {
  description: string;
  required_skills: string[];
  preferred_interests: string[];
  preferred_availability: string;
};

export type ScoredCandidate = {
  profile: CandidateInput;
  score: number;
  breakdown: Breakdown;
};

const AVAILABILITY_INDEX: Record<string, number> = { low: 0, medium: 1, high: 2 };

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "will",
  "need",
  "want",
  "into",
  "using",
  "use",
  "team",
  "project",
  "students",
  "student",
  "build",
  "building",
  "work",
  "working",
  "help",
  "make",
  "also",
  "some",
  "more",
  "than",
  "when",
  "them",
  "they",
  "their",
  "about",
  "over",
  "under",
  "across",
  "being",
  "been",
  "were",
  "what",
  "which",
  "while",
  "would",
  "could",
  "should",
  "there",
  "other",
  "each",
  "many",
  "must",
]);

function lower(list: string[]): string[] {
  return list.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function skillOverlap(required: string[], candidate: string[]): string[] {
  const cand = new Set(lower(normalizeSkills(candidate)));
  return normalizeSkills(required).filter((s) => cand.has(s.toLowerCase()));
}

function availabilityFit(preferred: string, candidate: string): number {
  const a = AVAILABILITY_INDEX[preferred] ?? 1;
  const b = AVAILABILITY_INDEX[candidate] ?? 1;
  const distance = Math.abs(a - b);
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  return 0.1;
}

function experienceRelevance(project: ProjectInput, candidate: CandidateInput): number {
  const haystack =
    `${candidate.experience} ${candidate.bio} ${candidate.skills.join(" ")}`.toLowerCase();
  if (!haystack.trim()) return 0;

  const tokens = new Set<string>();
  for (const skill of normalizeSkills(project.required_skills)) tokens.add(skill.toLowerCase());
  for (const word of project.description.toLowerCase().split(/[^a-z0-9+.#]+/)) {
    if (word.length > 3 && !STOP_WORDS.has(word)) tokens.add(word);
  }
  if (tokens.size === 0) return 0;

  const list = [...tokens];
  const hits = list.filter((t) => haystack.includes(t)).length;
  const denominator = Math.min(list.length, 8);
  return Math.min(1, hits / denominator);
}

function interestAlignment(preferred: string[], candidate: string[]): number {
  const wanted = lower(preferred);
  if (wanted.length === 0) return 1;
  const have = new Set(lower(candidate));
  const hits = wanted.filter((i) => have.has(i)).length;
  return hits / wanted.length;
}

export function coveredSkills(required: string[], members: { skills: string[] }[]): string[] {
  const covered = new Set<string>();
  for (const member of members) {
    for (const skill of skillOverlap(required, member.skills)) covered.add(skill);
  }
  return [...covered];
}

export function scoreCandidate(
  project: ProjectInput,
  candidate: CandidateInput,
  teamCovered: string[],
): ScoredCandidate {
  const required = normalizeSkills(project.required_skills);
  const matchedSkills = skillOverlap(required, candidate.skills);
  const skill = required.length === 0 ? 1 : matchedSkills.length / required.length;

  const availability = availabilityFit(project.preferred_availability, candidate.availability);
  const experience = experienceRelevance(project, candidate);
  const interest = interestAlignment(project.preferred_interests, candidate.interests);

  const coveredLower = new Set(teamCovered.map((s) => s.toLowerCase()));
  const addsNew = matchedSkills.some((s) => !coveredLower.has(s.toLowerCase()));
  const complementarity = required.length === 0 ? 0 : addsNew ? 1 : 0;

  const total =
    WEIGHTS.skill * skill +
    WEIGHTS.availability * availability +
    WEIGHTS.experience * experience +
    WEIGHTS.interest * interest +
    WEIGHTS.complementarity * complementarity;

  const matchedLower = new Set(matchedSkills.map((s) => s.toLowerCase()));

  return {
    profile: candidate,
    score: Math.round(Math.max(0, Math.min(100, total))),
    breakdown: {
      skill: Number(skill.toFixed(3)),
      availability: Number(availability.toFixed(3)),
      experience: Number(experience.toFixed(3)),
      interest: Number(interest.toFixed(3)),
      complementarity,
      matchedSkills,
      missingSkills: required.filter((s) => !matchedLower.has(s.toLowerCase())),
    },
  };
}

export function rankCandidates(
  project: ProjectInput,
  candidates: CandidateInput[],
  teamCovered: string[],
  limit = 10,
): ScoredCandidate[] {
  return candidates
    .map((c) => scoreCandidate(project, c, teamCovered))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.breakdown.skill - a.breakdown.skill ||
        b.breakdown.availability - a.breakdown.availability ||
        a.profile.full_name.localeCompare(b.profile.full_name),
    )
    .slice(0, limit);
}

export function fitLabel(score: number): { label: string; tone: "high" | "medium" | "low" } {
  if (score >= 70) return { label: "Strong fit", tone: "high" };
  if (score >= 45) return { label: "Possible fit", tone: "medium" };
  return { label: "Low fit", tone: "low" };
}

/** Deterministic fallback used whenever AI explanation generation is unavailable. */
export function templateExplanation(candidate: ScoredCandidate, project: ProjectInput): string {
  const { breakdown, score, profile } = candidate;
  const parts: string[] = [];

  parts.push(
    breakdown.matchedSkills.length > 0
      ? `covers ${breakdown.matchedSkills.slice(0, 4).join(", ")} from the required skills`
      : `does not currently list any of the required skills`,
  );

  const availabilityWord =
    breakdown.availability === 1
      ? `availability matches the project's ${project.preferred_availability} expectation`
      : breakdown.availability >= 0.5
        ? `availability is close to the project's ${project.preferred_availability} expectation`
        : `availability differs from the project's ${project.preferred_availability} expectation`;
  parts.push(`${availabilityWord} (${profile.hours_per_week}h/week)`);

  if (breakdown.experience >= 0.5) parts.push("past project experience overlaps with the brief");
  if (breakdown.interest >= 0.5 && project.preferred_interests.length > 0)
    parts.push("shares the project's stated interests");
  if (breakdown.complementarity === 1 && breakdown.matchedSkills.length > 0)
    parts.push("adds a required skill the current team does not cover");

  return `${score}% match — ${profile.full_name} ${parts.join("; ")}.`;
}

export type { Availability };
