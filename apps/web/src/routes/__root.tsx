import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/shell";
import { applyTheme, useAppStore, useHydrated } from "@/lib/store";
import appCss from "../styles.css?url";

const APP_NAME = "FORMA";
const THEME_BOOT = `(function(){try{var raw=localStorage.getItem('forma-v1');if(!raw)return;var t=JSON.parse(raw).state.profile.theme;var dark=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "Домашний тренер и диетолог. Без зала." },
      { name: "theme-color", content: "#2F6F5E" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Sora:wght@500;600&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <Gate />
        <Scripts />
      </body>
    </html>
  );
}

function Gate() {
  const ready = useHydrated();
  const theme = useAppStore((s) => s.profile.theme);
  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
  }, [ready, theme]);
  return (
    <>
      <AppShell />
      <Toaster position="top-center" toastOptions={{ className: "!bg-surface !text-fg !border-border !shadow-card" }} />
    </>
  );
}
