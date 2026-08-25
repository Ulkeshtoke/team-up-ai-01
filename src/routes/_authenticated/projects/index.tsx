import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, FolderPlus, Plus, Sparkles, Users } from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
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
      { title: "My Projects — ProjectMatch" },
      {
        name: "description",
        content: "View and manage your student projects and team matching rosters.",
      },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const {
    data: projects,
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

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your project briefs and discover ideal team candidates with algorithmic scoring.
          </p>
        </div>
        <Button asChild size="default" className="gap-2 shrink-0">
          <Link to="/projects/new">
            <Plus className="h-4 w-4" />
            Create New Project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-destructive">Failed to load your projects.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((project) => {
            const memberCount = project.project_members?.length ?? 0;
            const targetSize = project.team_size || 4;
            const progressPercent = Math.min(100, Math.round((memberCount / targetSize) * 100));

            return (
              <Card
                key={project.id}
                className="group relative flex flex-col justify-between border-border transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                onClick={() => navigate({ to: "/projects/$id", params: { id: project.id } })}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <Badge variant="secondary" className="capitalize text-xs shrink-0">
                      {project.category || "Project"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pb-3">
                  {project.required_skills && project.required_skills.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Required Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.required_skills.slice(0, 4).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs bg-muted/40 font-normal"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {project.required_skills.length > 4 && (
                          <Badge variant="outline" className="text-xs bg-muted/40 font-normal">
                            +{project.required_skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Team Roster ({memberCount}/{targetSize})
                      </span>
                      <span>{progressPercent}% filled</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {AVAILABILITY_LABEL[project.preferred_availability as Availability] ||
                        "Medium availability"}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                    Find matches <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
              <FolderPlus className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              Create a project brief with required skills and expectations to run AI & deterministic
              matching against candidate profiles.
            </p>
            <Button asChild size="default" className="gap-2">
              <Link to="/projects/new">
                <Sparkles className="h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
