import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ChipPicker } from "@/components/ChipPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { suggestSkills } from "@/lib/matchmaking.functions";
import { fetchMyProfile } from "@/lib/queries";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_LEVELS,
  INTEREST_OPTIONS,
  PROJECT_CATEGORIES,
  SKILL_OPTIONS,
  normalizeInterest,
  normalizeSkill,
  normalizeSkills,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({
    meta: [
      { title: "Create Project — ProjectMatch" },
      {
        name: "description",
        content: "Create a new project brief to discover matched team candidates.",
      },
    ],
  }),
  component: CreateProjectPage,
});

function CreateProjectPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("hackathon");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredInterests, setPreferredInterests] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState(4);
  const [preferredAvailability, setPreferredAvailability] = useState<string>("medium");

  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleExtractSkills = async () => {
    const text = description.trim();
    if (!text) {
      toast.error("Please enter a project description first.");
      return;
    }

    setExtracting(true);
    try {
      const res = await suggestSkills({ data: { description: text } });
      const extracted = res.skills ?? [];

      if (extracted.length > 0) {
        const merged = normalizeSkills([...requiredSkills, ...extracted]);
        setRequiredSkills(merged);
        const newCount = merged.length - requiredSkills.length;
        if (newCount > 0) {
          toast.success(
            `Extracted ${newCount} skill${newCount === 1 ? "" : "s"} from your description!`,
          );
        } else {
          toast.info("All detected skills are already in your list.");
        }
      } else {
        // Fallback to client-side taxonomy search
        const lowerDesc = text.toLowerCase();
        const clientMatches = SKILL_OPTIONS.filter((s) => lowerDesc.includes(s.toLowerCase()));
        if (clientMatches.length > 0) {
          const merged = normalizeSkills([...requiredSkills, ...clientMatches]);
          setRequiredSkills(merged);
          toast.success(`Identified ${clientMatches.length} matching skills from description.`);
        } else {
          toast.info("No specific skills detected. Please select from the list below.");
        }
      }
    } catch {
      // Deterministic fallback if server call fails
      const lowerDesc = text.toLowerCase();
      const clientMatches = SKILL_OPTIONS.filter((s) => lowerDesc.includes(s.toLowerCase()));
      if (clientMatches.length > 0) {
        const merged = normalizeSkills([...requiredSkills, ...clientMatches]);
        setRequiredSkills(merged);
        toast.success(`Identified ${clientMatches.length} matching skills.`);
      } else {
        toast.error("Could not extract skills automatically. Please pick skills manually.");
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project title is required.");
      return;
    }
    if (requiredSkills.length === 0) {
      toast.error("Please specify at least 1 required skill for matching.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          category,
          description: description.trim(),
          required_skills: requiredSkills,
          preferred_interests: preferredInterests,
          team_size: teamSize,
          preferred_availability: preferredAvailability,
        })
        .select()
        .single();

      if (projectError) throw new Error(projectError.message);
      if (!project) throw new Error("Failed to create project");

      // Attempt to auto-add owner as project lead in project_members if profile exists
      try {
        const myProfile = await fetchMyProfile(user.id);
        if (myProfile?.id) {
          await supabase.from("project_members").insert({
            project_id: project.id,
            profile_id: myProfile.id,
            role: "Project Lead",
            status: "accepted",
          });
        }
      } catch (err) {
        console.warn("Could not auto-add owner to project_members:", err);
      }

      await queryClient.invalidateQueries({ queryKey: ["projects", user.id] });
      toast.success("Project created successfully!");
      navigate({ to: "/projects/$id", params: { id: project.id } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Define your project scope, target skills, and ideal team capacity to compute candidate
          compatibility.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
            <CardDescription>
              Basic information about the initiative or hackathon build.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Title *</Label>
              <Input
                id="project-name"
                required
                placeholder="e.g. AI Emergency Triage Assistant, Autonomous Drone Delivery"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="project-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="project-description">Project Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractSkills}
                  disabled={extracting || !description.trim()}
                  className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                >
                  {extracting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                  Extract Skills with AI
                </Button>
              </div>
              <Textarea
                id="project-description"
                rows={4}
                placeholder="Describe what you are building, the architecture, problem statement, and what kind of technical expertise is needed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Click "Extract Skills with AI" to automatically suggest required skills from
                your text.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Skills & Desired Interests</CardTitle>
            <CardDescription>
              Matching algorithm computes 45% weight on skill overlap and 10% on shared domain
              interests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <ChipPicker
              label="Required Skills *"
              options={SKILL_OPTIONS}
              value={requiredSkills}
              onChange={setRequiredSkills}
              normalize={normalizeSkill}
              helpText="Select skills that candidates must have. Candidate scoring directly checks this set."
            />
            <ChipPicker
              label="Preferred Domain Interests"
              options={INTEREST_OPTIONS}
              value={preferredInterests}
              onChange={setPreferredInterests}
              normalize={normalizeInterest}
              helpText="Candidates sharing these interests receive an interest alignment score boost."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Scope & Availability</CardTitle>
            <CardDescription>
              Set the target roster size and weekly commitment level.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-size">Target Team Size</Label>
              <Input
                id="team-size"
                type="number"
                min={2}
                max={10}
                value={teamSize}
                onChange={(e) =>
                  setTeamSize(Math.max(2, Math.min(10, Number(e.target.value) || 2)))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Total members including the project lead (2–10).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred-availability">Preferred Availability</Label>
              <Select value={preferredAvailability} onValueChange={setPreferredAvailability}>
                <SelectTrigger id="preferred-availability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {AVAILABILITY_LABEL[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Used to score candidate availability compatibility (20% weight).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" asChild>
            <Link to="/projects">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={submitting} className="gap-2">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Create Project & Find Matches
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
