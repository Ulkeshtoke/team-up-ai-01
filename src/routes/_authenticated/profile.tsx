import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Heart,
  Info,
  Loader2,
  Save,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ChipPicker } from "@/components/ChipPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/queries";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_LEVELS,
  INTEREST_OPTIONS,
  SKILL_OPTIONS,
  normalizeInterest,
  normalizeSkill,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Student Profile — ProjectMatch" },
      {
        name: "description",
        content:
          "Configure your skills, domain interests, experience, and weekly availability for algorithmic matchmaking.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: () => fetchMyProfile(user.id),
  });

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState<string>("medium");
  const [hours, setHours] = useState(15);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setBio(data.bio ?? "");
    setExperience(data.experience ?? "");
    setAvailability(data.availability ?? "medium");
    setHours(data.hours_per_week ?? 15);
    setSkills(data.skills ?? []);
    setInterests(data.interests ?? []);
  }, [data]);

  // Compute profile completeness score
  const completeness = useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 20;
    if (bio.trim()) score += 15;
    if (experience.trim()) score += 15;
    if (skills.length >= 3) score += 25;
    else if (skills.length > 0) score += 15;
    if (interests.length >= 2) score += 15;
    else if (interests.length > 0) score += 10;
    if (hours > 0) score += 10;
    return Math.min(100, score);
  }, [fullName, bio, experience, skills, interests, hours]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name: fullName.trim(),
      bio: bio.trim(),
      experience: experience.trim(),
      availability,
      hours_per_week: Number.isFinite(hours) ? hours : 0,
      skills,
      interests,
    };

    const { error } = data
      ? await supabase.from("profiles").update(payload).eq("id", data.id)
      : await supabase.from("profiles").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast.success("Profile updated successfully!");
    navigate({ to: "/projects" });
  };

  return (
    <AppShell breadcrumbs={[{ label: "My Profile" }]}>
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
              Student Profile
            </h1>
            <Badge
              variant="secondary"
              className="bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/20 text-xs font-semibold"
            >
              Candidate Pool
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your profile informs the deterministic 5-factor scoring engine when team leads evaluate
            candidates.
          </p>
        </div>

        {/* Completeness Card */}
        <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs min-w-[240px]">
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Profile Strength</span>
              <span className="font-bold text-foreground">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2 bg-muted" />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
            <Zap className="h-4 w-4" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-destructive font-medium">Unable to load profile data.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={save} className="space-y-8">
          {/* Section 1: Personal & Bio */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">1. Background & Bio</CardTitle>
                  <CardDescription className="text-xs">
                    Primary identity and experience summary displayed on candidate match cards.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full-name" className="text-xs font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Kim"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experience" className="text-xs font-medium">
                    Experience Level / Seniority
                  </Label>
                  <Input
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 2nd Year CS, 2 previous hackathon wins"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-medium">
                  Short Bio & Working Style
                </Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell potential teammates about your project interests, past work, and how you like to collaborate…"
                  className="text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Availability & Commitment */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    2. Availability & Weekly Commitment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Weights for 20% of the matching formula. Ensure your commitment accurately
                    reflects your schedule.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              <div className="grid gap-6 sm:grid-cols-2 items-start">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Availability Band</Label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select band" />
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
                    Matches projects seeking similar workload bandwidth.
                  </p>
                </div>

                <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Estimated Hours / Week</Label>
                    <span className="rounded-md bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-300 border border-teal-500/20">
                      {hours} hrs / week
                    </span>
                  </div>
                  <Slider
                    value={[hours]}
                    onValueChange={([val]) => setHours(val ?? 10)}
                    min={5}
                    max={40}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>5h (Part-time)</span>
                    <span>20h (Standard)</span>
                    <span>40h (Intensive)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Taxonomy Skills & Interests */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">3. Skills & Domain Interests</CardTitle>
                  <CardDescription className="text-xs">
                    Skills account for 45% and Interests account for 10% of compatibility
                    calculations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              <ChipPicker
                label="Technical & Functional Skills"
                helpText="Select all relevant languages, frameworks, design tools, and domain specializations."
                options={SKILL_OPTIONS}
                value={skills}
                onChange={setSkills}
                normalize={normalizeSkill}
                placeholder="Search taxonomy (e.g. React, Python, UI Design, PyTorch)…"
              />

              <div className="border-t border-border/60 pt-4">
                <ChipPicker
                  label="Domain Interests & Problem Spaces"
                  helpText="Industries and project types you are enthusiastic to work on."
                  options={INTEREST_OPTIONS}
                  value={interests}
                  onChange={setInterests}
                  normalize={normalizeInterest}
                  placeholder="Search interests (e.g. AI & ML, Healthcare, EdTech, Climate)…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Actions Bar */}
          <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/95 p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-teal-600" />
              <span>
                Saving updates your ranking across all existing and future project searches.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <Link to="/projects">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium gap-1.5 shadow-xs flex-1 sm:flex-initial"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Profile & Continue</span>
              </Button>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
}
