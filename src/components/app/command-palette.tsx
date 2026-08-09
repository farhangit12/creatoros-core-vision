import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  CornerDownLeft,
  Plus,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navigation } from "@/lib/navigation";

const recents = [
  "Q3 launch script",
  "Thumbnail — episode 42",
  "Brand voice notes",
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search navigation, projects and actions"
      className="border-border bg-popover shadow-modal"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search projects, chats, files or jump to…"
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          <div className="px-2 py-8 text-center">
            <Search className="mx-auto size-5 text-text-subtle" />
            <p className="mt-3 text-sm text-foreground">No results</p>
            <p className="mt-1 text-xs text-text-subtle">
              Try a page name, or create something new.
            </p>
          </div>
        </CommandEmpty>

        {query.length === 0 ? (
          <CommandGroup heading="Recent">
            {recents.map((r) => (
              <CommandItem key={r} value={r} disabled>
                <Clock3 className="text-text-subtle" />
                <span>{r}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-text-subtle">
                  later phase
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem value="create project" onSelect={() => go("/projects")}>
            <Plus />
            <span>Create project</span>
            <kbd className="ml-auto rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-subtle">
              P
            </kbd>
          </CommandItem>
          <CommandItem value="new ai chat" onSelect={() => go("/chat")}>
            <ArrowRight />
            <span>Start a new AI chat</span>
          </CommandItem>
        </CommandGroup>

        {navigation.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.to}
                value={`${item.label} ${group.label}`}
                onSelect={() => go(item.to)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.status === "later" ? (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-text-subtle">
                    later phase
                  </span>
                ) : (
                  <CornerDownLeft className="ml-auto size-3 text-text-subtle" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
        <span>↑ ↓ navigate · ↵ open · esc close</span>
        <span>CreatorOS</span>
      </div>
    </CommandDialog>
  );
}