import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "./logo";

type NavItem = { to: string; label: string };

export function SiteHeader() {
  const { user, role, isAdmin, profile, signOut, ready } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const items: NavItem[] = [{ to: "/shifts", label: "Find shifts" }];
  if (role === "employer") {
    items.push({ to: "/employer", label: "Dashboard" }, { to: "/employer/shifts/new", label: "Post a shift" });
  }
  if (role === "locum") {
    items.push({ to: "/locum", label: "Dashboard" }, { to: "/locum/profile", label: "My profile" });
  }
  if (isAdmin) items.push({ to: "/admin", label: "Admin" });

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const activeCls = "text-foreground bg-accent";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: i.to !== "/shifts" }}>
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          {ready && !user && (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
              </Button>
            </>
          )}
          {user && (
            <>
              <Button variant="ghost" size="icon" asChild aria-label={`Notifications${unread.data ? `, ${unread.data} unread` : ""}`}>
                <Link to="/notifications" className="relative">
                  <Bell />
                  {!!unread.data && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-highlight px-1 text-[10px] font-bold text-highlight-foreground">
                      {unread.data > 9 ? "9+" : unread.data}
                    </span>
                  )}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu" className="hidden md:inline-flex">
                    <UserIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name || user.email}
                    <span className="block text-xs font-normal capitalize text-muted-foreground">
                      {role ? `${role} account` : "Setup incomplete"}
                      {isAdmin ? " · admin" : ""}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === "employer" && (
                    <DropdownMenuItem asChild><Link to="/employer/pharmacy">Pharmacy profile</Link></DropdownMenuItem>
                  )}
                  {role === "locum" && (
                    <DropdownMenuItem asChild><Link to="/locum/profile">Locum profile</Link></DropdownMenuItem>
                  )}
                  {!role && !isAdmin && (
                    <DropdownMenuItem asChild><Link to="/onboarding">Finish setup</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-2" aria-label="Mobile">
                {items.map((i) => (
                  <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className={linkCls} activeProps={{ className: activeCls }}>
                    {i.label}
                  </Link>
                ))}
                {user && (
                  <Link to="/notifications" onClick={() => setOpen(false)} className={linkCls}>Notifications</Link>
                )}
                <div className="my-2 border-t" />
                {user ? (
                  <button className={`${linkCls} text-left`} onClick={() => { setOpen(false); handleSignOut(); }}>
                    Sign out
                  </button>
                ) : (
                  <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)} className={linkCls}>Sign in</Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
