import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SidebarNav } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { CommandPalette } from "@/components/app/command-palette";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { getUserSettings } from "@/lib/server/settings";
import { applyTheme, type ThemeSetting } from "@/lib/theme";

const SETTINGS_QUERY_KEY = ["user-settings"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const getUserSettingsFn = useServerFn(getUserSettings);
  const { data: settings } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });

  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme as ThemeSetting);
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings?.theme]);

  const keyboardFirstMode = settings?.keyboardFirstMode ?? true;

  useEffect(() => {
    if (!keyboardFirstMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboardFirstMode]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen w-full bg-background">
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <SidebarNav
            collapsed={collapsed}
            onToggle={() => setCollapsed((v) => !v)}
          />
        </aside>

        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
          <SheetContent
            side="left"
            className="w-[280px] border-border bg-sidebar p-0"
          >
            <SidebarNav
              collapsed={false}
              mobile
              onNavigate={() => setMobileNav(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenSearch={() => setPaletteOpen(true)}
            onOpenMobileNav={() => setMobileNav(true)}
          />
          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
            <div className="mx-auto w-full max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}