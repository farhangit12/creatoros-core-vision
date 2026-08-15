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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Command,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border bg-popover p-0 shadow-modal sm:max-w-[600px]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:size-4">
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
          <CommandItem value="generate script" onSelect={() => go("/script-studio")}>
            <ArrowRight />
            <span>Generate a script</span>
          </CommandItem>
          <CommandItem value="create thumbnail" onSelect={() => go("/thumbnail-studio")}>
            <ArrowRight />
            <span>Create a thumbnail</span>
          </CommandItem>
          <CommandItem value="create image" onSelect={() => go("/image-studio")}>
            <ArrowRight />
            <span>Create an image</span>
          </CommandItem>
          <CommandItem value="upload file" onSelect={() => go("/files")}>
            <Plus />
            <span>Upload a file</span>
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
        </Command>
      </DialogContent>
    </Dialog>
  );
}