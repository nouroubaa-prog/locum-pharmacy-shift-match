import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingNext({ title, body }: { title: string; body: string }) {
  return (
    <div className="container-app py-12">
      <div className="surface flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 rounded-full bg-primary-soft p-3 text-primary"><Construction className="h-6 w-6" aria-hidden /></div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
        <Button variant="outline" className="mt-6" asChild><Link to="/shifts">Browse shifts</Link></Button>
      </div>
    </div>
  );
}
