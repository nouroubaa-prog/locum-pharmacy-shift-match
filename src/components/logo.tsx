import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight" aria-label="Locum4U home">
      <img src="/favicon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
      <span>
        Locum<span className="text-primary">4U</span>
      </span>
    </Link>
  );
}
