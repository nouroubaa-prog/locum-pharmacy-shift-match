import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, Lock, Percent, Stethoscope, MapPinned } from "lucide-react";
import heroImg from "@/assets/hero-pharmacist.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShiftCard } from "@/components/shift-card";
import { ListSkeleton } from "@/components/states";
import { ResponsibilityNotice } from "@/components/responsibility-notice";
import { useAuth, dashboardPathFor } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Locum4U — Pharmacy locum shifts, booked direct" },
      {
        name: "description",
        content:
          "Pharmacies post locum shifts and pharmacists apply directly — no agency commission. Launching in Ireland, ready for the UK.",
      },
      { property: "og:title", content: "Locum4U — Pharmacy locum shifts, booked direct" },
      {
        property: "og:description",
        content: "Pharmacies post locum shifts and pharmacists apply directly — no agency commission.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function LatestShifts() {
  const q = useQuery({
    queryKey: ["landing-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "open")
        .gt("application_deadline", new Date().toISOString())
        .order("shift_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (!q.data?.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {q.data.map((s) => (
        <ShiftCard key={s.id} shift={s} />
      ))}
    </div>
  );
}

function Index() {
  const { user, role, isAdmin } = useAuth();
  const dash = dashboardPathFor(role, isAdmin);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero">
        <div className="container-app grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="animate-rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Now live in Ireland · UK ready
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Locum shifts,
              <br />
              <span className="text-primary">booked direct.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Pharmacies post shifts. Pharmacists apply. You talk to each other — no agency in the middle and no
              commission on either side.
            </p>

            {user ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="xl" variant="hero" asChild>
                  <Link to={dash}>
                    Go to your dashboard <ArrowRight />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/shifts">Browse shifts</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose how you'll use Locum4U">
                <Link
                  to="/auth"
                  search={{ mode: "signup", role: "employer" }}
                  className="surface group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="rounded-lg bg-primary p-2 text-primary-foreground">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">I'm an employer</span>
                    <span className="block text-sm text-muted-foreground">Post shifts for my pharmacy</span>
                  </span>
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup", role: "locum" }}
                  className="surface group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="rounded-lg bg-highlight p-2 text-highlight-foreground">
                    <Stethoscope className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">I'm a locum</span>
                    <span className="block text-sm text-muted-foreground">Find and apply for shifts</span>
                  </span>
                </Link>
              </div>
            )}
            {!user && (
              <p className="mt-4 text-sm text-muted-foreground">
                Already registered?{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>{" "}
                ·{" "}
                <Link to="/shifts" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Browse shifts first
                </Link>
              </p>
            )}
          </div>
          <div className="relative hidden md:block">
            <img
              src={heroImg}
              alt="A community pharmacist smiling behind the counter of a bright pharmacy"
              width={1280}
              height={1440}
              className="aspect-[8/9] w-full rounded-[2rem] object-cover shadow-lift"
            />
            <div className="surface absolute -bottom-6 -left-6 w-64 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agency fee</p>
              <p className="font-display text-3xl font-extrabold text-primary">€0.00</p>
              <p className="text-xs text-muted-foreground">Rates are agreed between you, directly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-app py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Percent,
              title: "No commission",
              body: "Employers pay locums directly at the advertised rate. Locum4U takes nothing from the shift.",
            },
            {
              icon: Lock,
              title: "Contact after applying",
              body: "Pharmacy contact details stay private until a locum applies — then they're shared with that applicant only.",
            },
            {
              icon: MapPinned,
              title: "Matched to you",
              body: "Locums see a simple score based on distance, availability, rate and registration — fully explained.",
            },
          ].map((f) => (
            <div key={f.title} className="surface p-5">
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest */}
      <section className="container-app pb-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Open now</p>
            <h2 className="text-2xl font-bold">Upcoming shifts</h2>
          </div>
          <Button variant="link" asChild>
            <Link to="/shifts">
              See all <ArrowRight />
            </Link>
          </Button>
        </div>
        <LatestShifts />
      </section>

      {/* Steps */}
      <section className="container-app py-14">
        <div className="grid gap-8 rounded-[2rem] bg-ink p-6 text-ink-foreground sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">For pharmacies</h2>
            <ul className="mt-4 space-y-3">
              {["Create your pharmacy profile", "Post a shift with rate, times and requirements", "Review applicants and their self-declared registration", "Mark the shift filled — done"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-highlight" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">For locums</h2>
            <ul className="mt-4 space-y-3">
              {["Set your base town, radius, days and preferred rate", "Filter shifts by location, date, rate and registration", "Apply in one tap — contact details unlock instantly", "Track every application in one place"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-highlight" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <ResponsibilityNotice />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Locum4U is a listings marketplace only. It does not handle payments, payroll, timesheets, contracts or HR
          documents, and does not provide clinical services.
        </p>
      </section>
    </div>
  );
}
