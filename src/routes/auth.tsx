import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck, Building2, Stethoscope } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, zodErrors } from "@/components/field";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";
type IntendedRole = "employer" | "locum";

export const ROLE_INTENT_KEY = "locum4u.intendedRole";

function safeRedirect(r: string | undefined): string {
  if (!r) return "/dashboard";
  try {
    const u = new URL(r, "http://x");
    if (u.origin !== "http://x" && typeof window !== "undefined" && u.origin !== window.location.origin) return "/dashboard";
    const path = u.pathname + u.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode; role?: IntendedRole; redirect?: string } => ({
    mode: s.mode === "signup" || s.mode === "forgot" ? s.mode : s.mode === "signin" ? "signin" : undefined,
    role: s.role === "employer" || s.role === "locum" ? s.role : undefined,
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Locum4U" },
      { name: "description", content: "Sign in or register as a pharmacy employer or locum pharmacist on Locum4U." },
      { property: "og:title", content: "Sign in — Locum4U" },
      { property: "og:description", content: "Sign in or register as a pharmacy employer or locum pharmacist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});
const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [role, setRole] = useState<IntendedRole | undefined>(search.role);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const target = safeRedirect(search.redirect);

  useEffect(() => {
    if (role) window.localStorage.setItem(ROLE_INTENT_KEY, role);
  }, [role]);

  useEffect(() => {
    if (ready && user) navigate({ to: target, replace: true });
  }, [ready, user, navigate, target]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (mode === "signin") {
      const p = signInSchema.safeParse(form);
      if (!p.success) return setErrors(zodErrors(p.error.issues));
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) {
        setErrors({ form: error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message });
        return;
      }
      navigate({ to: target, replace: true });
    } else if (mode === "signup") {
      const p = signUpSchema.safeParse(form);
      if (!p.success) return setErrors(zodErrors(p.error.issues));
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: p.data.email,
        password: p.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: p.data.full_name },
        },
      });
      setBusy(false);
      if (error) return setErrors({ form: error.message });
      if (!data.session) setSentTo(p.data.email);
    } else {
      const p = z.object({ email: z.string().trim().email("Enter a valid email") }).safeParse(form);
      if (!p.success) return setErrors(zodErrors(p.error.issues));
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(p.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return setErrors({ form: error.message });
      toast.success("If that email is registered, a reset link is on its way.");
      setMode("signin");
    }
  }

  async function oauth(provider: "google" | "lovable") {
    setBusy(true);
    window.sessionStorage.setItem("locum4u.postAuth", target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error("Sign-in didn't complete. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: target, replace: true });
  }

  if (sentTo) {
    return (
      <div className="container-app flex max-w-md flex-col items-center py-16 text-center">
        <div className="rounded-full bg-primary-soft p-4 text-primary"><MailCheck className="h-8 w-8" aria-hidden /></div>
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it to finish creating your account.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div className="container-app flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Free for employers and locums. No commission." : mode === "forgot" ? "We'll email you a secure link." : "Sign in to manage your shifts."}
        </p>

        <div className="surface mt-6 p-5 sm:p-6">
          {mode !== "forgot" && (
            <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setErrors({}); }} className="mb-5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {mode === "signup" && (
            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium">I'm joining as</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "employer", label: "Employer", icon: Building2 },
                  { v: "locum", label: "Locum", icon: Stethoscope },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    aria-pressed={role === o.v}
                    onClick={() => setRole(o.v)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                      role === o.v ? "border-primary bg-primary-soft text-primary" : "hover:bg-accent",
                    )}
                  >
                    <o.icon className="h-4 w-4" aria-hidden /> {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">You'll confirm this after signing in. Each account has one type.</p>
            </fieldset>
          )}

          {mode !== "forgot" && (
            <>
              <div className="space-y-2">
                <button type="button" className="google-button" onClick={() => oauth("google")} disabled={busy}>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
                <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")} disabled={busy}>
                  Continue with Lovable
                </button>
              </div>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <Field id="full_name" label="Full name" error={errors.full_name}>
                <Input id="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} aria-invalid={!!errors.full_name} />
              </Field>
            )}
            <Field id="email" label="Email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
            </Field>
            {mode !== "forgot" && (
              <Field id="password" label="Password" error={errors.password} hint={mode === "signup" ? "At least 8 characters" : undefined}>
                <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={set("password")} aria-invalid={!!errors.password} />
              </Field>
            )}
            {errors.form && <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">{errors.form}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "signin" && (
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            )}
            {mode === "forgot" && (
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy notice</Link>.
        </p>
      </div>
    </div>
  );
}
