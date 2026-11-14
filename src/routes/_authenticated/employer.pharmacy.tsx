import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/employer/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy profile — Locum4U" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingNext title="Pharmacy profile" body="Add your pharmacy name, address and private contact details here." />,
});
