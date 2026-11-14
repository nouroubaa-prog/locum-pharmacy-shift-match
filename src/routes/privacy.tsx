import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy notice — Locum4U" },
      { name: "description", content: "How Locum4U collects, uses and protects personal data under GDPR." },
      { property: "og:title", content: "Privacy notice — Locum4U" },
      { property: "og:description", content: "How Locum4U collects, uses and protects personal data under GDPR." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="container-app max-w-3xl py-10">
      <p className="mb-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
        Placeholder — this notice must be reviewed by a qualified data-protection adviser before launch.
      </p>
      <h1 className="text-3xl font-bold">Privacy notice</h1>
      <div className="mt-6 space-y-5 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        <p>Locum4U ("we") operates a marketplace that lets pharmacy employers and locum pharmacists contact each other directly. We act as data controller for account data.</p>
        <h2>What we collect (and only this)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account: name, email, optional phone, account type.</li>
          <li>Locums: self-declared PSI/GPhC number, base town and radius, availability, preferred rate, years of experience, optional short bio.</li>
          <li>Employers: pharmacy name, address and business contact details; shift listings.</li>
          <li>Applications, reports and in-app notifications.</li>
        </ul>
        <p>We do not collect payment data, HR documents, contracts, identity documents or health data.</p>
        <h2>Who sees what</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Shift listings (without contact details) are public.</li>
          <li>A shift's contact details are shown only to locums who have applied to that shift.</li>
          <li>A locum's contact details and profile are shown only to employers whose shifts they applied to.</li>
          <li>Moderators can view data needed to handle reports and abuse.</li>
        </ul>
        <h2>Lawful basis</h2>
        <p>Performance of a contract (providing the marketplace) and legitimate interests (safety and moderation). [To be confirmed]</p>
        <h2>Retention</h2>
        <p>[Placeholder] Account data is kept while your account is active and deleted within [X] days of a deletion request. Expired listings are retained for [X] months for dispute handling.</p>
        <h2>Your rights</h2>
        <p>You can request access, correction, deletion, restriction or portability of your data, and object to processing, by emailing [privacy@locum4u.example]. You may complain to the Data Protection Commission (Ireland) or the ICO (UK).</p>
        <h2>Processors</h2>
        <p>[Placeholder] Hosting and database provider; optional AI text-parsing provider used only when an employer clicks "Suggest fields" on their own shift description.</p>
      </div>
    </article>
  );
}
