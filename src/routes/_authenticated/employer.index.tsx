import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/states";
import { ApplicationConversations } from "@/components/chat/application-conversations";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({
    meta: [{ title: "Employer dashboard — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <div className="container-app max-w-3xl py-8">
      <PageHeader title="Employer dashboard" />
      <ApplicationConversations />
    </div>
  ),
});
