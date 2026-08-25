import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  FolderPlus,
  Info,
  Loader2,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ChipPicker } from "@/components/ChipPicker";
import { Badge } from "@/components/ui/badge";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { suggestSkills } from "@/lib/matchmaking.functions";
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
      { title: "Create New Project — ProjectMatch" },
      {
        name: "description",
        content: "Draft a new project brief to discover matched candidate teammates.",
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

      // Auto-add the creator as the first team member (Lead)
      const { error: memberError } = await supabase.from("project_members").insert({
        project_id: project.id,
        profile_id: user.id,
        role: "Project Lead",
        status: "accepted",
      });

      if (memberError && !memberError.message.includes("foreign key")) {
        console.warn("Could not auto-add owner as member:", memberError);
      }

      await queryClient.invalidateQueries({ queryKey: ["projects", user.id] });
      toast.success("Project created! Now let's find matching candidates.");
      navigate({ to: "/projects/$id", params: { id: project.id } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Create New Project" }]}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
              Create Project Brief
            </h1>
            <Badge
              variant="secondary"
              className="bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/20 text-xs font-semibold"
            >
              Team Matching Ready
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Define your project scope and technical requirements to calculate candidate match
            compatibility.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Projects</span>
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
        {/* Section 1: Overview & Scope */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">1. Project Overview & Scope</CardTitle>
                <CardDescription className="text-xs">
                  Basic title, category, and functional description of what your team will build.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="proj-name" className="text-xs font-medium">
                  Project Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="proj-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI-Powered Medical Image Triage"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-category" className="text-xs font-medium">
                  Category / Context
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="proj-category" className="h-10 text-sm">
                    <SelectValue placeholder="Select context" />
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
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="proj-desc" className="text-xs font-medium">
                  Project Description
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractSkills}
                  disabled={extracting || !description.trim()}
                  className="h-7 px-2.5 text-xs text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 gap-1.5"
                >
                  {extracting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  <span>Auto-Extract Skills</span>
                </Button>
              </div>
              <Textarea
                id="proj-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your team is building, target technologies (e.g. Next.js, FastAPI, PyTorch), and specific goals…"
                className="text-sm leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Mentioning frameworks and technologies allows the Auto-Extract button to
                populate required skills automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Team Capacity & Workload */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  2. Team Capacity & Availability Preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  Set target roster size and expected weekly time commitment.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Target Team Size</Label>
                  <span className="rounded-md bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-300 border border-teal-500/20">
                    {teamSize} members
                  </span>
                </div>
                <Slider
                  value={[teamSize]}
                  onValueChange={([val]) => setTeamSize(val ?? 4)}
                  min={2}
                  max={8}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>2 (Duo)</span>
                  <span>4 (Standard)</span>
                  <span>8 (Squad)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Preferred Candidate Availability</Label>
                <Select value={preferredAvailability} onValueChange={setPreferredAvailability}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select commitment" />
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
                  Candidates with matching availability receive up to +20% score boost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Skill Requirements & Domain Interests */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  3. Required Skills & Preferred Interests
                </CardTitle>
                <CardDescription className="text-xs">
                  Skills carry a 45% weight in candidate compatibility scoring. At least 1 required
                  skill is required.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            <ChipPicker
              label="Required Skills (45% Weight)"
              helpText="Select critical engineering, design, or domain proficiencies required for your project."
              options={SKILL_OPTIONS}
              value={requiredSkills}
              onChange={setRequiredSkills}
              normalize={normalizeSkill}
              placeholder="Search skills (e.g. React, Python, PostgreSQL, Figma)…"
            />

            <div className="border-t border-border/60 pt-4">
              <ChipPicker
                label="Preferred Interests & Topics (10% Weight)"
                helpText="Optional domain topics that increase candidate alignment scores."
                options={INTEREST_OPTIONS}
                value={preferredInterests}
                onChange={setPreferredInterests}
                normalize={normalizeInterest}
                placeholder="Search interests (e.g. AI & ML, Healthcare, Web3, FinTech)…"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sticky Form Action Footer */}
        <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/95 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-teal-600" />
            <span>
              {requiredSkills.length === 0
                ? "Add at least 1 required skill to enable algorithmic matching."
                : `Ready to match candidates across ${requiredSkills.length} required skills.`}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <Link to="/projects">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting || requiredSkills.length === 0}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium gap-1.5 shadow-xs flex-1 sm:flex-initial"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              <span>Create Project & Find Matches</span>
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
