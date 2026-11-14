import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "./types";

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  role: "employer" | "locum" | null;
  isAdmin: boolean;
  loadingAccount: boolean;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const accountQueryKey = (userId: string | undefined) => ["account", userId] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  const account = useQuery({
    queryKey: accountQueryKey(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return { profile, roles: (roles ?? []).map((r) => r.role) };
    },
  });

  const roles = account.data?.roles ?? [];
  const role = roles.includes("employer") ? "employer" : roles.includes("locum") ? "locum" : null;

  const value: AuthState = {
    ready,
    session,
    user,
    profile: account.data?.profile ?? null,
    roles,
    role,
    isAdmin: roles.includes("admin"),
    loadingAccount: !!user && account.isLoading,
    refreshAccount: async () => {
      await queryClient.invalidateQueries({ queryKey: accountQueryKey(user?.id) });
    },
    signOut: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function dashboardPathFor(role: "employer" | "locum" | null, isAdmin: boolean) {
  if (role === "employer") return "/employer" as const;
  if (role === "locum") return "/locum" as const;
  if (isAdmin) return "/admin" as const;
  return "/onboarding" as const;
}
