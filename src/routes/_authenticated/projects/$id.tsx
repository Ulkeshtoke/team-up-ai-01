import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Heart,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { findMatches } from "@/lib/matchmaking.functions";
import { coveredSkills, fitLabel } from "@/lib/matching";
import {
  fetchCachedMatches,
  fetchMembers,
  fetchProject,
  type MatchRecord,
  type MemberRow,
} from "@/lib/queries";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project Workspace & Candidate Matchmaking — ProjectMatch" },
      {
        name: "description",
        content:
          "Evaluate ranked candidate compatibility, AI explanations, and live team skill coverage.",
      },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id: projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [findingMatches, setFindingMatches] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("matches");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState<string>("all");

  // Fetch Project
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });

  // Fetch Team Members
  const {
    data: members = [],
    isLoading: isMembersLoading,
    refetch: refetchMembers,
  } = useQuery<MemberRow[]>({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchMembers(projectId),
  });

  // Fetch Matches
  const {
    data: matches = [],
    isLoading: isMatchesLoading,
    refetch: refetchMatches,
  } = useQuery<MatchRecord[]>({
    queryKey: ["project-matches", projectId],
    queryFn: () => fetchCachedMatches(projectId),
  });

  // Run Matchmaking Server Function
  const handleFindMatches = async () => {
    setFindingMatches(true);
    try {
      const res = await findMatches({ data: { projectId } });
      await queryClient.invalidateQueries({ queryKey: ["project-matches", projectId] });
      const count = res.matches?.length ?? 0;
      if (count > 0) {
        toast.success(`Evaluated and ranked ${count} candidates!`);
      } else {
        toast.info("No candidates available for matching at this time.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run matchmaking";
      toast.error(msg);
    } finally {
      setFindingMatches(false);
    }
  };

  // Add Candidate to Team
  const handleAddToTeam = async (candidateProfileId: string, candidateName: string) => {
    setAddingMemberId(candidateProfileId);
    try {
      // Check if candidate is already in team
      if (members.some((m) => m.profile_id === candidateProfileId)) {
        toast.info(`${candidateName} is already a member of this team.`);
        return;
      }

      const targetSize = project?.team_size || 4;
      if (members.length >= targetSize) {
        toast.error(`Team is already full (${members.length}/${targetSize} members).`);
        return;
      }

      const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        profile_id: candidateProfileId,
        role: "Member",
        status: "accepted",
      });

      if (error) throw new Error(error.message);

      toast.success(`${candidateName} added to the team roster!`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["projects", user.id] }),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member";
      toast.error(msg);
    } finally {
      setAddingMemberId(null);
    }
  };

  if (isProjectLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (isProjectError || !project) {
    return (
      <AppShell>
        <Card className="my-8 border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h2 className="text-xl font-bold mb-1">Project Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This project does not exist or you do not have permission to view it.
            </p>
            <Button asChild variant="outline">
              <Link to="/projects">Return to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const memberIds = new Set(members.map((m) => m.profile_id));
  const memberProfiles = members.map((m) => m.profiles).filter(Boolean) as {
    skills: string[];
    full_name: string;
  }[];

  const requiredSkills = project.required_skills ?? [];
  const covered = coveredSkills(requiredSkills, memberProfiles);
  const coveredLower = new Set(covered.map((s) => s.toLowerCase()));
  const missingSkills = requiredSkills.filter((s) => !coveredLower.has(s.toLowerCase()));
  const coveragePercent =
    requiredSkills.length === 0
      ? 100
      : Math.min(100, Math.round((covered.length / requiredSkills.length) * 100));

  const targetSize = project.team_size || 4;
  const currentMemberCount = members.length;
  const isTeamFull = currentMemberCount >= targetSize;

  // Filter matches based on candidate search and score threshold
  const filteredMatches = matches.filter((match) => {
    const prof = match.profiles;
    if (!prof) return false;

    const matchesSearch =
      !candidateSearch.trim() ||
      prof.full_name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      (prof.skills &&
        prof.skills.some((s) => s.toLowerCase().includes(candidateSearch.toLowerCase()))) ||
      (prof.bio && prof.bio.toLowerCase().includes(candidateSearch.toLowerCase()));

    let matchesScore = true;
    if (minScoreFilter === "strong") matchesScore = match.score >= 70;
    else if (minScoreFilter === "good") matchesScore = match.score >= 50;
    else if (minScoreFilter === "moderate") matchesScore = match.score >= 30;

    return matchesSearch && matchesScore;
  });

  return (
    <AppShell breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: project.name }]}>
      {/* Executive Project Workspace Header */}
      <div className="mb-6 space-y-4 border-b border-border/70 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                {project.name}
              </h1>
              <Badge
                variant="secondary"
                className="capitalize text-xs font-semibold bg-muted border border-border/60"
              >
                {project.category || "Project"}
              </Badge>
              {isTeamFull ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Roster Complete ({currentMemberCount}/{targetSize})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-medium">
                  {currentMemberCount}/{targetSize} Seats Filled
                </Badge>
              )}
            </div>

            {project.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start">
            <Button
              onClick={handleFindMatches}
              disabled={findingMatches}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
              size="default"
            >
              {findingMatches ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>
                {matches.length > 0 ? "Re-calculate Matches" : "Find Matching Candidates"}
              </span>
            </Button>
          </div>
        </div>

        {/* Required Skills & Quick Stats Ribbon */}
        <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border/80 bg-card p-4 text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Required Skills ({requiredSkills.length})
            </span>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {requiredSkills.map((s) => {
                const isCovered = coveredLower.has(s.toLowerCase());
                return (
                  <Badge
                    key={s}
                    variant={isCovered ? "secondary" : "outline"}
                    className={
                      isCovered
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/30 font-medium text-[11px]"
                        : "font-normal text-[11px] border-border/80"
                    }
                  >
                    {isCovered && <Check className="h-2.5 w-2.5 mr-1 text-emerald-600 inline" />}
                    {s}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4 pt-2 sm:pt-0">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Team Skill Coverage
            </span>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">
                  {covered.length} of {requiredSkills.length} covered
                </span>
                <span className="font-bold text-foreground">{coveragePercent}%</span>
              </div>
              <Progress value={coveragePercent} className="h-1.5 bg-muted" />
            </div>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4 pt-2 sm:pt-0">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Target Availability
            </span>
            <div className="flex items-center gap-1.5 text-foreground font-medium pt-1">
              <Clock className="h-3.5 w-3.5 text-teal-600" />
              <span>
                {AVAILABILITY_LABEL[project.preferred_availability as Availability] || "Medium"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-[480px]">
          <TabsTrigger value="matches" className="gap-2 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span>Matches ({matches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4 text-teal-600" />
            <span>
              Roster ({currentMemberCount}/{targetSize})
            </span>
          </TabsTrigger>
          <TabsTrigger value="brief" className="gap-2 text-xs sm:text-sm">
            <Briefcase className="h-4 w-4 text-teal-600" />
            <span>Project Brief</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: CANDIDATE MATCHES */}
        {/* ======================================================== */}
        <TabsContent value="matches" className="space-y-6">
          {/* Candidate Search & Filter Toolbar */}
          {matches.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 p-3 rounded-xl border border-border/80">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Search candidate name or skill…"
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Filter Score:</span>
                <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
                  <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="strong">Strong (≥70%)</SelectItem>
                    <SelectItem value="good">Good (≥50%)</SelectItem>
                    <SelectItem value="moderate">Moderate (≥30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isMatchesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="border-dashed border-2 border-border/80 bg-card/60">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 p-4 mb-4 border border-teal-500/20 shadow-2xs">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1.5 font-display">
                  No candidate matches generated yet
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                  Run the deterministic matchmaking engine to rank all available student candidate
                  profiles against your project requirements.
                </p>
                <Button
                  onClick={handleFindMatches}
                  disabled={findingMatches}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
                >
                  {findingMatches ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>Calculate Candidate Compatibility</span>
                </Button>
              </CardContent>
            </Card>
          ) : filteredMatches.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  No candidates match your current filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCandidateSearch("");
                    setMinScoreFilter("all");
                  }}
                >
                  Clear Candidate Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing {filteredMatches.length} candidate
                  {filteredMatches.length === 1 ? "" : "s"} evaluated by 5-Factor formula
                </span>
                <span className="hidden sm:inline">
                  Skills 45% • Availability 20% • Experience 20% • Interests 10% • Complementarity
                  5%
                </span>
              </div>

              <div className="grid gap-4">
                {filteredMatches.map((match) => {
                  const candidateProfile = match.profiles;
                  if (!candidateProfile) return null;

                  const fit = fitLabel(match.score);
                  const isAlreadyMember = memberIds.has(match.profile_id);
                  const isAddingThis = addingMemberId === match.profile_id;

                  const scoreBadgeStyle =
                    match.score >= 70
                      ? "text-emerald-700 bg-emerald-50 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : match.score >= 45
                        ? "text-teal-700 bg-teal-50 border-teal-500/30 dark:bg-teal-950/60 dark:text-teal-300"
                        : "text-slate-700 bg-slate-50 border-slate-300 dark:bg-slate-900 dark:text-slate-300";

                  return (
                    <Card
                      key={match.profile_id}
                      className="overflow-hidden border-border/80 bg-card hover:border-teal-500/50 hover:shadow-md transition-all rounded-xl"
                    >
                      <CardHeader className="pb-3 pt-5 border-b border-border/40 bg-muted/10">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            {/* Score Ring Container */}
                            <div
                              className={`flex flex-col items-center justify-center rounded-xl border p-2 w-16 h-16 shrink-0 font-bold shadow-2xs ${scoreBadgeStyle}`}
                            >
                              <span className="text-xl leading-none font-display">
                                {match.score}%
                              </span>
                              <span className="text-[9px] uppercase tracking-wider font-semibold mt-1">
                                Match
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg font-bold text-foreground">
                                  {candidateProfile.full_name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={`text-xs capitalize font-medium ${
                                    fit.tone === "high"
                                      ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : fit.tone === "medium"
                                        ? "border-amber-500/40 text-amber-700 bg-amber-50/50 dark:bg-amber-950/50 dark:text-amber-300"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {fit.label}
                                </Badge>
                                {match.breakdown?.complementarity === 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-500/20 font-semibold"
                                  >
                                    +5% Skill Complement
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock className="h-3.5 w-3.5 text-teal-600" />
                                  {AVAILABILITY_LABEL[
                                    candidateProfile.availability as Availability
                                  ] || candidateProfile.availability}{" "}
                                  ({candidateProfile.hours_per_week}h/week)
                                </span>
                                {candidateProfile.experience && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{candidateProfile.experience}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start">
                            {isAlreadyMember ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium"
                              >
                                <UserCheck className="h-4 w-4 text-emerald-600" />
                                <span>Already in Team</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAddToTeam(match.profile_id, candidateProfile.full_name)
                                }
                                disabled={isAddingThis || isTeamFull}
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                              >
                                {isAddingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserPlus className="h-4 w-4" />
                                )}
                                <span>{isTeamFull ? "Team Full" : "Add to Team"}</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-4 pb-5">
                        {/* Explainable Rationale Box */}
                        {match.explanation && (
                          <div className="rounded-xl border border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/40 p-3.5 text-xs leading-relaxed text-foreground">
                            <div className="flex items-start gap-2.5">
                              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground/90 font-medium">
                                {match.explanation}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Candidate Bio */}
                        {candidateProfile.bio && (
                          <p className="text-xs text-muted-foreground italic line-clamp-2 px-0.5">
                            "{candidateProfile.bio}"
                          </p>
                        )}

                        {/* Matched vs Other Skills */}
                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Matched Project Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.breakdown?.matchedSkills &&
                              match.breakdown.matchedSkills.length > 0 ? (
                                match.breakdown.matchedSkills.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs border border-emerald-500/20 font-medium"
                                  >
                                    <Check className="h-3 w-3 mr-1 text-emerald-600" />
                                    {s}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  No direct required skill matches
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Additional Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidateProfile.skills && candidateProfile.skills.length > 0 ? (
                                candidateProfile.skills
                                  .filter((s) => !match.breakdown?.matchedSkills?.includes(s))
                                  .slice(0, 5)
                                  .map((s) => (
                                    <Badge
                                      key={s}
                                      variant="outline"
                                      className="text-xs text-muted-foreground font-normal border-border/70"
                                    >
                                      {s}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  None listed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 5-Factor Score Breakdown Progress Meters */}
                        {match.breakdown && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11px] border-t border-border/60">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Skills (45%)</span>
                                <span className="font-bold text-foreground">
                                  {Math.round(match.breakdown.skill * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={match.breakdown.skill * 100}
                                className="h-1.5 bg-muted"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Availability (20%)</span>
                                <span className="font-bold text-foreground">
                                  {Math.round(match.breakdown.availability * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={match.breakdown.availability * 100}
                                className="h-1.5 bg-muted"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Experience (20%)</span>
                                <span className="font-bold text-foreground">
                                  {Math.round(match.breakdown.experience * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={match.breakdown.experience * 100}
                                className="h-1.5 bg-muted"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Interests (10%)</span>
                                <span className="font-bold text-foreground">
                                  {Math.round(match.breakdown.interest * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={match.breakdown.interest * 100}
                                className="h-1.5 bg-muted"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: TEAM ROSTER & SKILL COVERAGE */}
        {/* ======================================================== */}
        <TabsContent value="team" className="space-y-6">
          {/* Skill Coverage Analysis Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">Team Skill Coverage Analysis</CardTitle>
                  <CardDescription className="text-xs">
                    Comparing project requirements against the collective skill pool of all accepted
                    team members.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 font-display">
                    {coveragePercent}%
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Coverage</span>
                </div>
              </div>
              <Progress value={coveragePercent} className="h-2 mt-2 bg-muted" />
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2 pt-4">
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      Covered Skills ({covered.length}/{requiredSkills.length})
                    </span>
                  </div>
                </div>
                {covered.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {covered.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-500/30 text-xs font-medium"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No required skills covered yet by roster.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/40 p-4">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span>Skill Gaps Remaining ({missingSkills.length})</span>
                  </div>
                </div>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 text-xs font-medium"
                      >
                        Needs {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    ✓ All required project skills are covered by your current roster!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-foreground">
                Active Team Roster ({currentMemberCount} / {targetSize} seats)
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {targetSize - currentMemberCount > 0
                  ? `${targetSize - currentMemberCount} open position${targetSize - currentMemberCount === 1 ? "" : "s"}`
                  : "Roster full"}
              </span>
            </div>

            {members.length === 0 ? (
              <Card className="border-dashed p-8 text-center">
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-foreground">No team members added yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Switch to the Matches tab to add candidate profiles to this project roster.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {members.map((member) => {
                  const prof = member.profiles;
                  if (!prof) return null;

                  return (
                    <Card key={member.id} className="border-border/80 bg-card">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {prof.full_name}
                            </span>
                            <Badge
                              variant={member.role === "Project Lead" ? "default" : "secondary"}
                              className="text-xs font-semibold"
                            >
                              {member.role}
                            </Badge>
                            {prof.is_demo && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground"
                              >
                                Verified Candidate
                              </Badge>
                            )}
                          </div>
                          {prof.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{prof.bio}</p>
                          )}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {prof.skills &&
                              prof.skills.slice(0, 6).map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-[11px] font-normal border-border/70"
                                >
                                  {skill}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-teal-600" />
                            <span>
                              {AVAILABILITY_LABEL[prof.availability as Availability] ||
                                prof.availability}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: PROJECT BRIEF SPECIFICATION */}
        {/* ======================================================== */}
        <TabsContent value="brief" className="space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-lg font-bold">Project Specification</CardTitle>
              <CardDescription className="text-xs">
                Complete scope and metadata defined during project creation.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Project Title
                  </p>
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category / Context
                  </p>
                  <Badge variant="secondary" className="capitalize text-xs font-medium">
                    {project.category || "Hackathon"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Detailed Scope & Description
                </p>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-foreground">
                  {project.description || "No full description provided."}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/60">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Required Skills ({requiredSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs bg-muted/40 font-normal">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Preferred Domain Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.preferred_interests && project.preferred_interests.length > 0 ? (
                      project.preferred_interests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-xs font-normal">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
