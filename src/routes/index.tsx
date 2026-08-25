import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, Gauge, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectMatch — Find teammates who actually fit" },
      {
        name: "description",
        content:
          "ProjectMatch helps students build project teams by matching complementary skills, experience, interests and availability with explainable compatibility scores.",
      },
      { property: "og:title", content: "ProjectMatch — Find teammates who actually fit" },
      {
        property: "og:description",
        content:
          "Explainable student team formation: complementary skills, real experience, matching availability.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Compass,
    title: "Describe the project",
    body: "Write the brief. We suggest normalized required skills you can edit before saving.",
  },
  {
    icon: Gauge,
    title: "See explainable scores",
    body: "Every candidate gets a 0–100 score broken down into skills, availability, experience, interests and complementarity.",
  },
  {
    icon: Users,
    title: "Build a balanced team",
    body: "Add candidates to the roster and instantly see covered and missing required skills.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-lg font-bold">ProjectMatch</span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-20">
        <p className="mb-4 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Team formation for students
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Stop building teams from your friend list.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          ProjectMatch ranks students against your project by complementary skills, relevant
          experience, shared interests and compatible availability — and tells you exactly why.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        ProjectMatch — explainable student team formation.
      </footer>
    </div>
  );
}
