import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
      { title: "Project Match Dashboard — ProjectMatch" },
      {
        name: "description",
        content:
          "Evaluate ranked candidate compatibility, AI explanations, and team skill coverage.",
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

      toast.success(`${candidateName} added to the team!`);
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
        <div className="space-y-4">
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
        <Card className="my-8">
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
  const memberProfiles = members.map((m) => m.profiles).filter(Boolean) as { skills: string[] }[];

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

  return (
    <AppShell>
      {/* Top Header */}
      <div className="mb-6 space-y-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="secondary" className="capitalize text-xs">
                {project.category || "Project"}
              </Badge>
              {isTeamFull ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  Team Complete ({currentMemberCount}/{targetSize})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {currentMemberCount}/{targetSize} Members
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleFindMatches}
              disabled={findingMatches}
              className="gap-2 shadow-sm"
              size="default"
            >
              {findingMatches ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {matches.length > 0 ? "Re-run Matching" : "Find Matches"}
            </Button>
          </div>
        </div>

        {/* Required Skills & Metadata Banner */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 rounded-lg border border-border bg-card p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Required Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.map((s) => {
                const isCovered = coveredLower.has(s.toLowerCase());
                return (
                  <Badge
                    key={s}
                    variant={isCovered ? "secondary" : "outline"}
                    className={
                      isCovered
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-normal"
                        : "font-normal"
                    }
                  >
                    {isCovered ? <Check className="h-3 w-3 mr-1 text-emerald-600 inline" /> : null}
                    {s}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Target Availability:{" "}
              {AVAILABILITY_LABEL[project.preferred_availability as Availability] || "Medium"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="matches" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Matches ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team Roster ({currentMemberCount}/{targetSize})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MATCHES */}
        <TabsContent value="matches" className="space-y-6">
          {isMatchesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="rounded-full bg-primary/10 p-3.5 mb-4 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold mb-1.5">No matches generated yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-5">
                  Run the matchmaking algorithm to score candidate profiles against required skills,
                  availability, and past experience.
                </p>
                <Button onClick={handleFindMatches} disabled={findingMatches} className="gap-2">
                  {findingMatches ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Find Matching Candidates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Ranked by weighted compatibility (Skills 45%, Availability 20%, Experience 20%,
                  Interests 10%, Complementarity 5%)
                </span>
                <span>
                  {matches.length} candidate{matches.length === 1 ? "" : "s"} evaluated
                </span>
              </div>

              <div className="grid gap-5">
                {matches.map((match, idx) => {
                  const candidateProfile = match.profiles;
                  if (!candidateProfile) return null;

                  const fit = fitLabel(match.score);
                  const isAlreadyMember = memberIds.has(match.profile_id);
                  const isAddingThis = addingMemberId === match.profile_id;

                  const scoreColor =
                    match.score >= 70
                      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                      : match.score >= 45
                        ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
                        : "text-muted-foreground bg-muted border-border";

                  return (
                    <Card
                      key={match.profile_id}
                      className="overflow-hidden border-border transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex flex-col items-center justify-center rounded-xl border p-2 w-14 h-14 shrink-0 font-bold ${scoreColor}`}
                            >
                              <span className="text-lg leading-none">{match.score}%</span>
                              <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
                                Match
                              </span>
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg font-bold">
                                  {candidateProfile.full_name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={`text-xs capitalize font-medium ${
                                    fit.tone === "high"
                                      ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                                      : fit.tone === "medium"
                                        ? "border-amber-500/40 text-amber-600 bg-amber-500/5"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {fit.label}
                                </Badge>
                                {match.breakdown?.complementarity === 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] bg-primary/10 text-primary border-primary/20"
                                  >
                                    +5% Skill Complement
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {AVAILABILITY_LABEL[
                                    candidateProfile.availability as Availability
                                  ] || candidateProfile.availability}{" "}
                                  ({candidateProfile.hours_per_week}h/w)
                                </span>
                                {candidateProfile.is_demo && (
                                  <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                                    Verified Profile
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
                                className="gap-1.5 text-xs bg-muted/50"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                In Team
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAddToTeam(match.profile_id, candidateProfile.full_name)
                                }
                                disabled={isAddingThis || isTeamFull}
                                className="gap-1.5 text-xs"
                              >
                                {isAddingThis ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserPlus className="h-3.5 w-3.5" />
                                )}
                                {isTeamFull ? "Team Full" : "Add to Team"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-1 pb-5">
                        {/* Explanation Box */}
                        {match.explanation && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <p>{match.explanation}</p>
                            </div>
                          </div>
                        )}

                        {/* Bio / Past Experience */}
                        {(candidateProfile.bio || candidateProfile.experience) && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {candidateProfile.bio && (
                              <p className="line-clamp-2 italic">"{candidateProfile.bio}"</p>
                            )}
                            {candidateProfile.experience && (
                              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pt-1">
                                <Briefcase className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <p className="line-clamp-2">{candidateProfile.experience}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Skills Breakdown */}
                        <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-border/60">
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Matched Required Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.breakdown?.matchedSkills &&
                              match.breakdown.matchedSkills.length > 0 ? (
                                match.breakdown.matchedSkills.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs border-emerald-500/20"
                                  >
                                    <Check className="h-2.5 w-2.5 mr-1" />
                                    {s}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  None direct
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Other Candidate Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidateProfile.skills && candidateProfile.skills.length > 0 ? (
                                candidateProfile.skills
                                  .filter((s) => !match.breakdown?.matchedSkills?.includes(s))
                                  .slice(0, 4)
                                  .map((s) => (
                                    <Badge
                                      key={s}
                                      variant="outline"
                                      className="text-xs text-muted-foreground font-normal"
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

                        {/* Score Metric Progress Indicators */}
                        {match.breakdown && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Skill Overlap</span>
                                <span className="font-semibold text-foreground">
                                  {Math.round(match.breakdown.skill * 100)}%
                                </span>
                              </div>
                              <Progress value={match.breakdown.skill * 100} className="h-1" />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Availability</span>
                                <span className="font-semibold text-foreground">
                                  {Math.round(match.breakdown.availability * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={match.breakdown.availability * 100}
                                className="h-1"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Experience</span>
                                <span className="font-semibold text-foreground">
                                  {Math.round(match.breakdown.experience * 100)}%
                                </span>
                              </div>
                              <Progress value={match.breakdown.experience * 100} className="h-1" />
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Interests</span>
                                <span className="font-semibold text-foreground">
                                  {Math.round(match.breakdown.interest * 100)}%
                                </span>
                              </div>
                              <Progress value={match.breakdown.interest * 100} className="h-1" />
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

        {/* TAB 2: TEAM ROSTER & SKILL COVERAGE */}
        <TabsContent value="team" className="space-y-6">
          {/* Skill Coverage Analysis Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">Team Skill Coverage</CardTitle>
                  <CardDescription>
                    Tracking project requirements against skills possessed by current roster
                    members.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-primary">{coveragePercent}%</span>
                  <span className="text-xs text-muted-foreground">covered</span>
                </div>
              </div>
              <Progress value={coveragePercent} className="h-2.5 mt-2" />
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2 pt-2">
              <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Covered Skills ({covered.length}/{requiredSkills.length})
                </div>
                {covered.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {covered.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No required skills covered yet.</p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                  <XCircle className="h-4 w-4" />
                  Missing Skills Needed ({missingSkills.length})
                </div>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs"
                      >
                        Needs {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium">
                    All required project skills are covered by the current roster!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Roster ({currentMemberCount}/{targetSize})
              </h3>
              <span className="text-xs text-muted-foreground">
                {targetSize - currentMemberCount > 0
                  ? `${targetSize - currentMemberCount} open spot${targetSize - currentMemberCount === 1 ? "" : "s"}`
                  : "Roster complete"}
              </span>
            </div>

            {members.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No members in this team yet. Go to the Matches tab to add candidate profiles!
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {members.map((member) => {
                  const prof = member.profiles;
                  if (!prof) return null;

                  return (
                    <Card key={member.id} className="border-border">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{prof.full_name}</span>
                            <Badge
                              variant={member.role === "Project Lead" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {member.role}
                            </Badge>
                            {prof.is_demo && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground"
                              >
                                Verified
                              </Badge>
                            )}
                          </div>
                          {prof.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{prof.bio}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {prof.skills &&
                              prof.skills.slice(0, 6).map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-[11px] font-normal"
                                >
                                  {skill}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
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
      </Tabs>
    </AppShell>
  );
}
