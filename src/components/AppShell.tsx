import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, ChevronRight, FolderKanban, LogOut, Sparkles, User, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isProjectsActive = location.pathname.startsWith("/projects");
  const isProfileActive = location.pathname.startsWith("/profile");

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-100">
      {/* Top Enterprise Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand & Context */}
          <div className="flex items-center gap-6">
            <Link
              to="/projects"
              className="flex items-center gap-2.5 font-display text-lg font-bold text-foreground transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shadow-teal-500/20">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <span className="tracking-tight font-bold">
                Project<span className="text-teal-600 dark:text-teal-400">Match</span>
              </span>
            </Link>

            {/* Breadcrumbs for desktop */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className="text-border">/</span>
                {breadcrumbs.map((crumb, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                    {crumb.href ? (
                      <Link
                        to={crumb.href}
                        className="hover:text-foreground transition-colors max-w-[160px] truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium max-w-[200px] truncate">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* Primary Navigation & User controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 text-sm">
              <Link
                to="/projects"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isProjectsActive
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                <span>Projects</span>
              </Link>
              <Link
                to="/profile"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isProfileActive
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </nav>

            <div className="h-5 w-px bg-border/80 hidden sm:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5 text-xs sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {children}
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-border/60 bg-background/50 py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">ProjectMatch Enterprise</span>
            <span className="text-border">•</span>
            <span>Algorithmic & Explainable Team Formation</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Deterministic 5-Factor Scoring</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Engine Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
