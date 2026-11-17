import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container-app flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Locum4U · Direct pharmacy locum marketplace. No agency
          commission.
        </p>
        <nav className="flex gap-4" aria-label="Legal">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/shifts" className="hover:text-foreground">
            Find shifts
          </Link>
        </nav>
      </div>
    </footer>
  );
}
