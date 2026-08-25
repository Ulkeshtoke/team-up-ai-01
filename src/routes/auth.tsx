import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In / Register — ProjectMatch" },
      {
        name: "description",
        content:
          "Sign in or create a ProjectMatch account to build and manage student project teams.",
      },
      { property: "og:title", content: "Sign In / Register — ProjectMatch" },
    ],
  }),
  component: AuthPage,
});

function getErrorMessage(error: unknown): string {
  if (!error) return "An unexpected authentication error occurred.";
  if (typeof error === "string") return error;

  const err = error as { code?: string; message?: string; name?: string };
  const message = err.message || "";
  const code = err.code || "";
  const name = err.name || "";

  if (code === "email_not_confirmed" || message.toLowerCase().includes("email not confirmed")) {
    return "Your email address has not been confirmed yet. Please check your inbox for the confirmation email before signing in.";
  }
  if (
    code === "weak_password" ||
    name === "AuthWeakPasswordError" ||
    message.toLowerCase().includes("weak")
  ) {
    return "Password is too weak or commonly used. Please choose a stronger password with a combination of letters, numbers, and symbols.";
  }
  if (
    code === "invalid_credentials" ||
    message.toLowerCase().includes("invalid login credentials")
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (code === "user_already_exists" || message.toLowerCase().includes("already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }

  return message || "Authentication failed. Please check your details and try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Listen to auth state changes and navigate to /profile once a valid session exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: "/profile", replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        navigate({ to: "/profile", replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setAuthError(null);
    setAuthMessage(null);
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setBusy(false);
        const friendlyMessage = getErrorMessage(error);
        setAuthError(friendlyMessage);
        toast.error(friendlyMessage);
        return;
      }

      if (data.session?.user) {
        toast.success("Signed in successfully!");
        setBusy(false);
        navigate({ to: "/profile", replace: true });
      } else {
        setBusy(false);
      }
    } catch (err: unknown) {
      setBusy(false);
      const friendlyMessage = getErrorMessage(err);
      setAuthError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setAuthError(null);
    setAuthMessage(null);
    setBusy(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim() || trimmedEmail.split("@")[0]!;

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/projects`,
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        setBusy(false);
        const friendlyMessage = getErrorMessage(error);
        setAuthError(friendlyMessage);
        toast.error(friendlyMessage);
        return;
      }

      const userId = data.user?.id;
      if (userId && data.session?.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: userId,
          full_name: trimmedName,
        });
        if (profileError && !profileError.message.includes("duplicate")) {
          console.error("Profile creation error:", profileError);
        }
      }
      setBusy(false);

      if (!data.session) {
        const msg =
          "Account created! Please check your email to confirm your account before signing in.";
        setAuthMessage(msg);
        toast.success(msg);
      } else {
        toast.success("Account created successfully!");
        navigate({ to: "/profile", replace: true });
      }
    } catch (err: unknown) {
      setBusy(false);
      const friendlyMessage = getErrorMessage(err);
      setAuthError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-foreground hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shadow-teal-500/20">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <span>
            Project<span className="text-teal-600 dark:text-teal-400">Match</span>
          </span>
        </Link>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Algorithmic Student Team Formation & Skill Coverage
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-border/80 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <CardHeader className="pb-4">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as "signin" | "signup");
                setAuthError(null);
                setAuthMessage(null);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="text-xs sm:text-sm font-medium">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm font-medium">
                  Create Account
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {authError && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Authentication Error</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">{authError}</AlertDescription>
              </Alert>
            )}

            {authMessage && (
              <Alert className="border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 py-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <AlertTitle className="text-xs font-semibold">Verification Required</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                  {authMessage}
                </AlertDescription>
              </Alert>
            )}

            {activeTab === "signin" ? (
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-xs font-medium">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      disabled={busy}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium h-10 shadow-xs"
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={signUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-medium">
                    University / Personal Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      placeholder="jane@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-10 text-sm"
                      disabled={busy}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 6 characters with letters and numbers.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium h-10 shadow-xs"
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/60 bg-muted/20 py-3 text-center text-xs text-muted-foreground flex justify-center">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <span>Protected with secure Supabase Auth & RLS</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
