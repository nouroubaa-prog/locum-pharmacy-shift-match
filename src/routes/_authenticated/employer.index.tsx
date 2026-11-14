import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({ meta: [{ title: "Employer dashboard — Locum4U" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingNext title="Employer dashboard" body="Your pharmacy profile, active shifts and applicant counts will appear here." />,
});
