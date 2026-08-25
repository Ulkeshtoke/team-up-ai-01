import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/projects" className="flex items-center gap-2 font-display text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            ProjectMatch
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/projects"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Projects
            </Link>
            <Link
              to="/profile"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              My profile
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              <LogOut className="mr-1 h-4 w-4" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
