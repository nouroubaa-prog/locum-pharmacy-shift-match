import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { PageSpinner } from "@/components/states";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Locum4U" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { loadingAccount, role, isAdmin, ready } = useAuth();
  if (!ready || loadingAccount) return <PageSpinner />;
  return <Navigate to={dashboardPathFor(role, isAdmin)} replace />;
}
