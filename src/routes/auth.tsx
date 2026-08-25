import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ProjectMatch" },
      {
        name: "description",
        content: "Sign in or create a ProjectMatch account to build your student project team.",
      },
      { property: "og:title", content: "Sign in — ProjectMatch" },
      {
        property: "og:description",
        content: "Sign in or create a ProjectMatch account to build your student project team.",
      },
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
    // 1. Initial check for existing active session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: "/profile", replace: true });
      }
    });

    // 2. Reactive listener for SIGNED_IN and TOKEN_REFRESHED events
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
        setActiveTab("signin");
        return;
      }

      toast.success("Welcome! Complete your profile to get matched.");
      navigate({ to: "/profile", replace: true });
    } catch (err: unknown) {
      setBusy(false);
      const friendlyMessage = getErrorMessage(err);
      setAuthError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center font-display text-xl font-bold">
          ProjectMatch
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Use email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{authError}</div>
              </div>
            )}

            {authMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{authMessage}</div>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as "signin" | "signup");
                setAuthError(null);
                setAuthMessage(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="student@university.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      id="signup-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="Alex Chen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="student@university.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a strong password (minimum 6 characters).
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create account
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Next step: complete your student profile.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
