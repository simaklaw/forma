import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChartLine, Dumbbell, UserRound, Utensils } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Тренировки", icon: Dumbbell, exact: true },
  { to: "/nutrition", label: "Питание", icon: Utensils, exact: false },
  { to: "/progress", label: "Прогресс", icon: ChartLine, exact: false },
  { to: "/profile", label: "Профиль", icon: UserRound, exact: false },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onboarded = useAppStore((s) => s.profile.onboarded);
  const hideNav = pathname.startsWith("/play") || !onboarded;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className={cn("mx-auto min-h-dvh w-full max-w-lg", !hideNav && "pb-24")}>
        <Outlet />
      </div>
      {!hideNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/92 backdrop-blur-md"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                      active ? "text-accent" : "text-muted",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
