import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Check cached/in-memory session first to prevent premature bounce-back during login transitions
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      return { user: sessionData.session.user };
    }

    // Fall back to getUser network validation
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: userData.user };
  },
  component: () => <Outlet />,
});
