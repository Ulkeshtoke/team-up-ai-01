import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
      { title: "My profile — ProjectMatch" },
      {
        name: "description",
        content:
          "Set your skills, interests, experience and availability so projects can match you accurately.",
      },
      { property: "og:title", content: "My profile — ProjectMatch" },
      {
        property: "og:description",
        content: "Set your skills, interests, experience and availability on ProjectMatch.",
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
  const [hours, setHours] = useState(10);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setBio(data.bio ?? "");
    setExperience(data.experience ?? "");
    setAvailability(data.availability ?? "medium");
    setHours(data.hours_per_week ?? 10);
    setSkills(data.skills ?? []);
    setInterests(data.interests ?? []);
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
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
    toast.success("Profile saved");
    navigate({ to: "/projects" });
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My profile</h1>
        <p className="mt-1 text-muted-foreground">
          The richer this is, the better your matches — and the better you rank on other teams.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-muted-foreground">We couldn't load your profile.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About you</CardTitle>
              <CardDescription>Basic details shown on your match card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  placeholder="One or two lines about what you like building."
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience / past projects</Label>
                <Textarea
                  id="experience"
                  rows={5}
                  value={experience}
                  placeholder="Internships, hackathons, research, side projects…"
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & interests</CardTitle>
              <CardDescription>Pick from the list or add your own.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <ChipPicker
                label="Skills"
                options={SKILL_OPTIONS}
                value={skills}
                onChange={setSkills}
                normalize={normalizeSkill}
                helpText="Names are normalized automatically (ReactJS → React)."
              />
              <ChipPicker
                label="Interests"
                options={INTEREST_OPTIONS}
                value={interests}
                onChange={setInterests}
                normalize={normalizeInterest}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Used directly in the compatibility score.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availability">Availability level</Label>
                <Select value={availability} onValueChange={setAvailability}>
                  <SelectTrigger id="availability">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Hours per week</Label>
                <Input
                  id="hours"
                  type="number"
                  min={0}
                  max={80}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save profile
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
