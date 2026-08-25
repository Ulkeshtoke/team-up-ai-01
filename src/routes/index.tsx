import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileCheck2,
  FolderKanban,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectMatch — Enterprise Student Team Formation" },
      {
        name: "description",
        content:
          "ProjectMatch helps students and educators build balanced project teams with explainable 5-factor algorithmic scoring and real-time skill coverage analysis.",
      },
      { property: "og:title", content: "ProjectMatch — Enterprise Student Team Formation" },
      {
        name: "keywords",
        content:
          "team formation, student matchmaking, skill coverage, hackathon teams, capstone projects",
      },
    ],
  }),
  component: LandingPage,
});

const PILLARS = [
  {
    icon: BrainCircuit,
    title: "1. AI Skill Extraction & Taxonomy",
    body: "Transform project descriptions into standardized required skills using intelligent keyword mapping and taxonomy normalization.",
    metric: "Instant Tagging",
  },
  {
    icon: Gauge,
    title: "2. 5-Factor Explainable Scoring",
    body: "Deterministic 0–100 compatibility evaluation across Skills (45%), Availability (20%), Experience (20%), Interests (10%), and Complementarity (5%).",
    metric: "100% Deterministic",
  },
  {
    icon: Layers,
    title: "3. Real-Time Skill Coverage",
    body: "Live team roster management with visual gap analysis so you can see exactly which project requirements are covered and what roles remain.",
    metric: "Zero Skill Gaps",
  },
];

const SCORING_BREAKDOWN = [
  {
    factor: "Skills Alignment",
    weight: "45%",
    desc: "Direct match between candidate skills and project requirements",
    color: "bg-teal-500",
  },
  {
    factor: "Availability Fit",
    weight: "20%",
    desc: "Weekly hours and workload schedule alignment",
    color: "bg-emerald-500",
  },
  {
    factor: "Experience Level",
    weight: "20%",
    desc: "Practical background and demonstrated seniority in domain",
    color: "bg-blue-500",
  },
  {
    factor: "Shared Interests",
    weight: "10%",
    desc: "Passion and domain overlap across project topics",
    color: "bg-amber-500",
  },
  {
    factor: "Complementarity",
    weight: "5%",
    desc: "Diversification of perspectives and non-redundant strengths",
    color: "bg-purple-500",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans selection:bg-teal-500/20">
      {/* Enterprise Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shadow-teal-500/20">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Project<span className="text-teal-600 dark:text-teal-400">Match</span>
            </span>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex ml-2 text-[11px] font-medium border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/40"
            >
              Enterprise MVP
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-sm font-medium">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
            >
              <Link to="/auth">
                <span>Launch App</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Hero Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50/70 dark:bg-teal-950/50 px-3.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                <span>Explainable 5-Factor Student Matchmaking</span>
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Form high-performing student teams with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400">
                  algorithmic precision.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Replace arbitrary friend-group teams with structured compatibility scores.
                ProjectMatch ranks candidates across skills, availability, and experience, providing
                complete transparency into every match recommendation.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-2 h-12 px-6"
                >
                  <Link to="/auth">
                    <span>Create Your First Project</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <Link to="/auth">Sign In to Dashboard</Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/80 text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-foreground text-lg">100%</p>
                  <p className="text-muted-foreground">Explainable scoring</p>
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">5 Factors</p>
                  <p className="text-muted-foreground">Holistic evaluation</p>
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">Real-Time</p>
                  <p className="text-muted-foreground">Skill gap coverage</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Product Card Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 font-bold text-sm">
                      AK
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">Alex Kim</p>
                      <p className="text-xs text-muted-foreground">Full-Stack & Cloud Engineer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      94% Match
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Strong Fit</p>
                  </div>
                </div>

                <div className="space-y-4 py-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-muted-foreground">
                        Skills Alignment (45%)
                      </span>
                      <span className="font-bold text-foreground">92%</span>
                    </div>
                    <Progress value={92} className="h-1.5 bg-muted" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-muted-foreground">
                        Availability & Hours (20%)
                      </span>
                      <span className="font-bold text-foreground">100%</span>
                    </div>
                    <Progress value={100} className="h-1.5 bg-muted" />
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 text-xs border border-border/50">
                    <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      Algorithmic Match Rationale:
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      "Alex provides TypeScript and React expertise required by your core
                      architecture, backed by 15h/week availability."
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge
                      variant="secondary"
                      className="text-[11px] bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-normal"
                    >
                      ✓ React
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[11px] bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-normal"
                    >
                      ✓ TypeScript
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[11px] bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-normal"
                    >
                      ✓ PostgreSQL
                    </Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-9 shadow-2xs">
                    <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                    Simulate Add to Roster
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Factor Scoring Formula Section */}
      <section className="border-t border-b border-border/80 bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge
              variant="secondary"
              className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300"
            >
              Deterministic Methodology
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Transparent, Weighted Matching Formula
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Every candidate recommendation is derived from a transparent, reproducible formula. No
              opaque black-boxes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SCORING_BREAKDOWN.map((item) => (
              <Card
                key={item.factor}
                className="border-border/80 bg-card hover:border-teal-500/40 transition-all"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground font-display">
                      {item.weight}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold mt-1">{item.factor}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className="py-16 sm:py-24 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From Project Brief to Full Team in Minutes
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              A structured, linear process tailored for hackathons, university courses, and
              cross-functional project teams.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="relative rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold text-muted-foreground"
                      >
                        {pillar.metric}
                      </Badge>
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {pillar.body}
                    </p>
                  </div>
                  <div className="pt-6 mt-4 border-t border-border/60 flex items-center text-xs font-semibold text-teal-700 dark:text-teal-300">
                    <span>Phase 0{idx + 1} Architecture</span>
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border bg-gradient-to-br from-teal-800 to-slate-900 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl tracking-tight">
            Ready to build your dream project team?
          </h2>
          <p className="text-teal-100/80 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Create your account, specify your project requirements, and let our deterministic
            algorithm find the ideal student collaborators.
          </p>
          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="bg-white text-teal-900 hover:bg-teal-50 font-semibold shadow-lg h-12 px-8"
            >
              <Link to="/auth">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
