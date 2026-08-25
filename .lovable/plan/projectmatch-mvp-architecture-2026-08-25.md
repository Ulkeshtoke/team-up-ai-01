# ProjectMatch — MVP Architecture

AI-assisted team formation for students. Goal: a polished, demo-safe MVP buildable in a few hours.

## 1. Screens

| Screen                   | Route                      | Purpose                                                               |
| ------------------------ | -------------------------- | --------------------------------------------------------------------- |
| Landing                  | `/`                        | Value prop, sign in / sign up CTA                                     |
| Auth                     | `/auth`                    | Email + password (Lovable Cloud auth)                                 |
| My Profile               | `/profile`                 | Create/edit skills, interests, experience, availability               |
| Projects                 | `/projects`                | List of my projects + "New project"                                   |
| New Project              | `/projects/new`            | Name, description, required skills, team size, preferred availability |
| Project Detail / Matches | `/projects/:id`            | Ranked candidate list, score breakdown, explanation, invite           |
| Team                     | `/projects/:id` (Team tab) | Current members, open roles, remove member                            |
| Discover (optional)      | `/discover`                | Browse all student profiles with filters                              |

Only 6 essential screens. No chat, feeds, payments, or admin.

## 2. End-to-end journey

```text
Sign up -> Complete profile (skills, interests, experience, availability)
   -> Create project (required skills, team size, availability)
   -> Run "Find matches" (deterministic scoring over all profiles)
   -> Review ranked candidates + score bars + AI explanation
   -> Add to team (invite) -> Team roster shows filled/missing skills
```

Demo path is ~90 seconds: seeded students already exist, so matches appear instantly on first project.

## 3. Data model

```text
profiles (1) ──< project (owner) >── project_members >── profiles
profiles ──< profile_skills            projects ──< project_required_skills
```

| Table             | Key columns                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`        | `id` (= auth user), `full_name`, `bio`, `experience` (text), `availability` (enum: low/medium/high), `hours_per_week` (int), `skills` (text[]), `interests` (text[])                                                  |
| `projects`        | `id`, `owner_id`, `name`, `description`, `category` (hackathon/research/startup/course), `required_skills` (text[]), `preferred_interests` (text[]), `team_size` (int), `preferred_availability` (enum), `created_at` |
| `project_members` | `id`, `project_id`, `profile_id`, `role`, `status` (invited/accepted), unique(project_id, profile_id)                                                                                                                 |
| `matches` (cache) | `id`, `project_id`, `profile_id`, `score`, `breakdown` (jsonb), `explanation` (text), `created_at`                                                                                                                    |

Arrays (`text[]`) instead of join tables keeps the MVP small; still filterable with `overlaps`.

RLS: everyone authenticated can read `profiles` (discovery requires it) but only edit their own row; projects and members readable by all, writable by owner; `matches` readable/writable by project owner.

## 4. Matching architecture & score

Deterministic, computed in a server function (fast, explainable, no API dependency).

| Component             | Weight | Rule                                                                           |
| --------------------- | ------ | ------------------------------------------------------------------------------ |
| Skill match           | 45     | `                                                                              | required ∩ student skills               | /   | required  | `                         |
| Availability fit      | 20     | exact match = 1.0, one level off = 0.5, two off = 0.1                          |
| Experience relevance  | 20     | keyword overlap between project description/skills and experience text, capped |
| Interest alignment    | 10     | `                                                                              | preferred interests ∩ student interests | /   | preferred | ` (1.0 if none specified) |
| Complementarity bonus | 5      | student covers a required skill no current team member has                     |

`score = round(Σ weight × component)` → 0–100. Ties broken by skill match, then availability.

Rank all candidates, exclude the owner and existing members, return top 10 with a `breakdown` object so the UI can render per-factor bars.

## 5. AI vs deterministic

| Task                                                  | Approach                                            | Why                                                      |
| ----------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Compatibility score                                   | Deterministic                                       | Reproducible, instant, defensible in a demo              |
| Ranking / filtering                                   | Deterministic                                       | No latency or rate-limit risk                            |
| Skill extraction from a free-text project description | AI (one call at project creation, editable by user) | Turns prose into a normalized skill list                 |
| Match explanation ("why this student")                | AI (batched, one call for top candidates)           | Natural, persuasive copy on top of the numeric breakdown |
| Skill name normalization (`reactjs` → `React`)        | Deterministic alias map + AI fallback               | Keeps overlap math honest                                |

AI is always additive: if the AI call fails, a templated explanation generated from the breakdown is shown instead. The demo never breaks on an AI outage.

## 6. Simplest buildable MVP

- React + TanStack Start frontend, Tailwind design system, shadcn components.
- Lovable Cloud (Postgres + auth + server functions) — no external accounts.
- One migration: 4 tables, RLS policies, grants, plus ~15 seeded demo student profiles inserted literally in the migration so matching has data on first load.
- One server function `findMatches(projectId)`: loads project + profiles, scores in TypeScript, calls AI once for explanations, caches into `matches`.
- One server function `extractSkills(description)`.
- Everything else is plain CRUD through the client with RLS.

Build order: design system → auth + profile → projects CRUD → matching function → matches UI → team roster → polish.

## 7. Technical risks for a live demo

| Risk                                             | Mitigation                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| AI call slow or failing                          | Timeout ~8s, fall back to template explanation; cache results in `matches`             |
| Empty database → no matches                      | Seed 15 diverse student profiles in the migration                                      |
| Skill string mismatch (`Node` vs `Node.js`)      | Normalize lowercase + alias map; choose skills from a fixed picker, free text optional |
| RLS blocking profile discovery                   | Explicit read policy for authenticated users, tested before demo                       |
| Sign-up email confirmation blocking login        | Auto-confirm enabled; keep a pre-made demo account                                     |
| Cold-start latency on first match                | Prefetch matches in the project route loader                                           |
| Score all-zero edge case (no overlapping skills) | Always show top 10 with a "low fit" label rather than an empty state                   |

## 8. Stack

React 19 + TanStack Start (Vite), Tailwind v4 design tokens, shadcn/ui, Lovable Cloud for auth/Postgres/RLS/server functions, Lovable AI Gateway for the two AI calls. This matches the requested "React + Supabase" shape — Lovable Cloud is Postgres + auth with no external setup.
