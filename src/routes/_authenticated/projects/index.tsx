import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Filter,
  FolderKanban,
  FolderPlus,
  Layers,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/queries";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/taxonomy";

type ProjectWithMembers = Project & {
  project_members?: { id: string }[];
};

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Project Management Workspace — ProjectMatch" },
      {
        name: "description",
        content:
          "View, manage, and discover candidate matches across your active student projects.",
      },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ProjectWithMembers[]>({
    queryKey: ["projects", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_members(id)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProjectWithMembers[];
    },
  });

  // Calculate executive KPI summary statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    let totalTargetSeats = 0;
    let totalFilledSeats = 0;
    const allSkills = new Set<string>();

    projects.forEach((p) => {
      totalTargetSeats += p.team_size || 4;
      totalFilledSeats += p.project_members?.length || 0;
      (p.required_skills || []).forEach((s) => allSkills.add(s));
    });

    const openPositions = Math.max(0, totalTargetSeats - totalFilledSeats);
    const avgTeamFill =
      totalTargetSeats > 0 ? Math.round((totalFilledSeats / totalTargetSeats) * 100) : 0;

    return {
      totalProjects,
      totalFilledSeats,
      openPositions,
      uniqueSkills: allSkills.size,
      avgTeamFill,
    };
  }, [projects]);

  // Filter projects by query and category
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchQuery.trim() ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description &&
          project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (project.required_skills &&
          project.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [projects, searchQuery, categoryFilter]);

  return (
    <AppShell breadcrumbs={[{ label: "Projects" }]}>
      {/* Workspace Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
              Projects Dashboard
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              {projects.length} {projects.length === 1 ? "Active Brief" : "Active Briefs"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your project briefs, evaluate algorithmic compatibility, and assemble balanced
            student teams.
          </p>
        </div>

        <Button
          asChild
          size="default"
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs shrink-0"
        >
          <Link to="/projects/new">
            <Plus className="h-4 w-4" />
            <span>Create New Project</span>
          </Link>
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                {stats.totalProjects}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Filled Team Seats</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                {stats.totalFilledSeats}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Open Roles to Match</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                {stats.openPositions}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <UserPlus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tracked Skills</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                {stats.uniqueSkills}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      {projects.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or skill…"
              className="pl-9 h-9 text-xs sm:text-sm bg-card"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline-block" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[180px] bg-card">
                <SelectValue placeholder="Category Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hackathon">Hackathon</SelectItem>
                <SelectItem value="course">Course Project</SelectItem>
                <SelectItem value="capstone">Capstone</SelectItem>
                <SelectItem value="research">Research Lab</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="open_source">Open Source</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Projects Grid / Content */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-destructive font-medium">Failed to retrieve projects.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const memberCount = project.project_members?.length ?? 0;
            const targetSize = project.team_size || 4;
            const progressPercent = Math.min(100, Math.round((memberCount / targetSize) * 100));
            const isFull = memberCount >= targetSize;

            return (
              <Card
                key={project.id}
                className="group relative flex flex-col justify-between border-border/80 bg-card hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer rounded-xl overflow-hidden"
                onClick={() => navigate({ to: "/projects/$id", params: { id: project.id } })}
              >
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="capitalize text-[11px] font-medium shrink-0 bg-background border border-border/60"
                    >
                      {project.category || "Project"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1.5 text-xs text-muted-foreground leading-relaxed min-h-[32px]">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 py-4 flex-1">
                  {/* Required Skills Chips */}
                  {project.required_skills && project.required_skills.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                          Required Skills
                        </span>
                        <span className="text-muted-foreground">
                          {project.required_skills.length} total
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {project.required_skills.slice(0, 4).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[11px] bg-muted/40 font-normal border-border/70"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {project.required_skills.length > 4 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-muted/40 font-normal border-border/70"
                          >
                            +{project.required_skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                      <span>
                        {
                          AVAILABILITY_LABEL[
                            (project.preferred_availability as Availability) || "medium"
                          ]
                        }
                      </span>
                    </span>
                  </div>

                  {/* Team Capacity Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Team Roster
                      </span>
                      <span
                        className={
                          isFull
                            ? "font-bold text-emerald-600 dark:text-emerald-400"
                            : "font-bold text-foreground"
                        }
                      >
                        {memberCount} / {targetSize} seats {isFull && "(Full)"}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-muted" />
                  </div>
                </CardContent>

                <CardFooter className="pt-3 pb-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    5-Factor Match Ready
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed border-2 border-border/80 bg-card/60 p-12 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/20">
              <FolderPlus className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-display text-lg font-bold text-foreground">
                {searchQuery || categoryFilter !== "all"
                  ? "No matching projects found"
                  : "No project briefs created yet"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {searchQuery || categoryFilter !== "all"
                  ? "Try clearing your search filters to see all available projects."
                  : "Create your first project brief to start matching candidates against your required skillset and team preferences."}
              </p>
            </div>
            {searchQuery || categoryFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                asChild
                size="default"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
              >
                <Link to="/projects/new">
                  <Plus className="h-4 w-4" />
                  <span>Create Project Brief</span>
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
