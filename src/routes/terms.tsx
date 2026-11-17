import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — Locum4U" },
      {
        name: "description",
        content: "Terms for employers and locum pharmacists using the Locum4U marketplace.",
      },
      { property: "og:title", content: "Terms of use — Locum4U" },
      {
        property: "og:description",
        content: "Terms for employers and locum pharmacists using the Locum4U marketplace.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <article className="container-app max-w-3xl py-10">
      <p className="mb-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
        Placeholder — these terms must be reviewed by a solicitor before launch.
      </p>
      <h1 className="text-3xl font-bold">Terms of use</h1>
      <div className="mt-6 space-y-5 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        <h2>1. What Locum4U is</h2>
        <p>
          Locum4U is a listings marketplace. We are not an employment agency, employer, staffing
          business or clinical service, and we charge no commission on shifts.
        </p>
        <h2>2. What Locum4U is not</h2>
        <p>
          We do not process payments, payroll or timesheets, issue contracts, store HR documents, or
          provide clinical services. Any engagement is agreed directly between the employer and the
          locum.
        </p>
        <h2>3. Verification</h2>
        <p>
          Registration numbers (PSI, GPhC) and experience are self-declared and{" "}
          <strong>not verified</strong> by Locum4U. Employers are solely responsible for checking
          registration, professional indemnity insurance, right to work and suitability before
          confirming any shift.
        </p>
        <h2>4. Your responsibilities</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide accurate information and keep it up to date.</li>
          <li>Employers: post genuine shifts at the advertised rate and keep listings current.</li>
          <li>Use contact details only to arrange the shift you applied to or advertised.</li>
        </ul>
        <h2>5. Moderation</h2>
        <p>
          We may hide listings or suspend accounts that are reported or appear to breach these
          terms.
        </p>
        <h2>6. Liability</h2>
        <p>[Placeholder — limitation of liability, governing law (Ireland), contact details.]</p>
      </div>
    </article>
  );
}
