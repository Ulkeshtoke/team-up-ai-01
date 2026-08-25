import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string | null;
  full_name: string;
  bio: string;
  experience: string;
  availability: string;
  hours_per_week: number;
  skills: string[];
  interests: string[];
  is_demo: boolean;
};

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  category: string;
  required_skills: string[];
  preferred_interests: string[];
  team_size: number;
  preferred_availability: string;
  created_at: string;
};

export type MemberRow = {
  id: string;
  project_id: string;
  profile_id: string;
  role: string;
  status: string;
  profiles: Profile | null;
};

export type MatchRecord = {
  profile_id: string;
  score: number;
  breakdown: {
    skill: number;
    availability: number;
    experience: number;
    interest: number;
    complementarity: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  explanation: string;
  profiles?: Profile | null;
};

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

export async function fetchProjects(ownerId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Project) ?? null;
}

export async function fetchMembers(projectId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("*, profiles(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MemberRow[];
}

export async function fetchCachedMatches(projectId: string): Promise<MatchRecord[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("profile_id, score, breakdown, explanation, profiles(*)")
    .eq("project_id", projectId)
    .order("score", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MatchRecord[];
}
