import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MessagesSquare,
  Plus,
  Search,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Send,
  Square,
  Copy,
  RefreshCcw,
  ThumbsUp,
  ThumbsDown,
  Save,
  FileText,
  Lightbulb,
  Image as ImageIcon,
  Menu,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/app/primitives";
import { ContextActions, CostHint, GeneratingState, StatusPill } from "@/components/app/studio-kit";
import { models, tones } from "@/lib/creator-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  getConversationMessages,
  listConversations,
  sendChatMessage,
  type ConversationRecord,
  type MessageRecord,
} from "@/lib/server/ai/chat";
import { getUserSettings } from "@/lib/server/settings";

const SETTINGS_QUERY_KEY = ["user-settings"] as const;

export const Route = createFileRoute("/_app/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat — CreatorOS AI" },
      { name: "description", content: "A conversational workspace for ideation, rewriting and research — with your brand voice in context." },
      { property: "og:title", content: "AI Chat — CreatorOS AI" },
      { property: "og:description", content: "A conversational workspace for ideation, rewriting and research — with your brand voice in context." },
    ],
  }),
  component: ChatPage,
});

type Group = "Pinned" | "Today" | "Earlier";

type UIConversation = ConversationRecord & { group: Group };

type DisplayMessage = { id: string; role: "user" | "assistant"; content: string };

const suggestedPrompts = [
  "Draft 5 hooks for my next video",
  "Turn this transcript into a script outline",
  "Rewrite my caption in a bolder tone",
  "Summarise my last 3 uploads' comments",
];

const CHAT_CONVERSATIONS_KEY = ["ai-chat-conversations"] as const;
const chatMessagesKey = (conversationId: string) => ["ai-chat-messages", conversationId] as const;

function formatRelativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export default function ChatPage() {
  return <ChatPageImpl />;
}

function ChatPageImpl() {
  const queryClient = useQueryClient();
  const listConversationsFn = useServerFn(listConversations);
  const getMessagesFn = useServerFn(getConversationMessages);
  const sendMessageFn = useServerFn(sendChatMessage);
  const getUserSettingsFn = useServerFn(getUserSettings);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const [draft, setDraft] = useState("");
  const [pendingMessages, setPendingMessages] = useState<DisplayMessage[]>([]);
  const [visuallyStopped, setVisuallyStopped] = useState(false);
  const [modelId, setModelId] = useState<string>(models[0]!.id);
  const [toneValue, setToneValue] = useState<string>(tones[0]!);

  const { data: settings } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });
  useEffect(() => {
    if (settings?.defaultAiTone && tones.includes(settings.defaultAiTone)) {
      setToneValue(settings.defaultAiTone);
    }
  }, [settings?.userId]);

  const [renameTarget, setRenameTarget] = useState<ConversationRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConversationRecord | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: CHAT_CONVERSATIONS_KEY,
    queryFn: () => listConversationsFn(),
  });

  const messagesQuery = useQuery({
    queryKey: activeId ? chatMessagesKey(activeId) : ["ai-chat-messages", "none"],
    queryFn: () => getMessagesFn({ data: { conversationId: activeId! } }),
    enabled: !!activeId,
  });

  const uiConversations: UIConversation[] = useMemo(
    () =>
      conversations.map((c) => {
        const group: Group = pinnedIds.has(c.id)
          ? "Pinned"
          : isSameDay(new Date(c.updatedAt), new Date())
            ? "Today"
            : "Earlier";
        return { ...c, group };
      }),
    [conversations, pinnedIds],
  );

  const active = conversations.find((c) => c.id === activeId);

  const filtered = useMemo(
    () =>
      uiConversations.filter((c) =>
        (c.title ?? "New chat").toLowerCase().includes(search.toLowerCase()),
      ),
    [uiConversations, search],
  );

  const groups: Group[] = ["Pinned", "Today", "Earlier"];

  const persistedMessages: DisplayMessage[] = (messagesQuery.data ?? []).map((m: MessageRecord) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const messages: DisplayMessage[] = [...persistedMessages, ...pendingMessages];

  const sendMutation = useMutation({
    mutationFn: (vars: { content: string; conversationId?: string; tone?: string }) =>
      sendMessageFn({ data: vars }),
    onSuccess: async (result) => {
      const wasNew = !activeId;
      await queryClient.fetchQuery({
        queryKey: chatMessagesKey(result.conversationId),
        queryFn: () => getMessagesFn({ data: { conversationId: result.conversationId } }),
      });
      if (wasNew) setActiveId(result.conversationId);
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
      setPendingMessages([]);
      setVisuallyStopped(false);
    },
    onError: () => {
      toast.error("Couldn't send that message. Try again.");
      setPendingMessages([]);
      setVisuallyStopped(false);
    },
  });

  const isGenerating = sendMutation.isPending && !visuallyStopped;

  function togglePin(c: ConversationRecord) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  }

  function confirmRename() {
    if (!renameTarget) return;
    queryClient.setQueryData(CHAT_CONVERSATIONS_KEY, (old: ConversationRecord[] | undefined) =>
      (old ?? []).map((x) => (x.id === renameTarget.id ? { ...x, title: renameValue || x.title } : x)),
    );
    setRenameTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    queryClient.setQueryData(CHAT_CONVERSATIONS_KEY, (old: ConversationRecord[] | undefined) =>
      (old ?? []).filter((x) => x.id !== deleteTarget.id),
    );
    if (activeId === deleteTarget.id) setActiveId(null);
    setDeleteTarget(null);
  }

  function handleSend() {
    if (!draft.trim() || sendMutation.isPending) return;
    const content = draft.trim();
    setPendingMessages([{ id: `local-${Date.now()}`, role: "user", content }]);
    setVisuallyStopped(false);
    setDraft("");
    sendMutation.mutate({
      content,
      ...(activeId ? { conversationId: activeId } : {}),
      ...(toneValue ? { tone: toneValue } : {}),
    });
  }

  function stopGeneration() {
    setVisuallyStopped(true);
  }

  function startNewChat() {
    setActiveId(null);
    setPendingMessages([]);
    setVisuallyStopped(false);
    setDraft("");
  }

  const activeModel = models.find((m) => m.id === modelId) ?? models[0]!;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[600px] gap-4">
      {/* Left rail */}
      <div
        className={cn(
          "w-[280px] shrink-0 flex-col rounded-xl border border-border bg-surface",
          mobileRailOpen ? "fixed inset-y-4 left-4 z-40 flex w-[85vw] max-w-[320px] lg:static lg:w-[280px]" : "hidden lg:flex",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle p-3">
          <Button size="sm" className="flex-1 justify-start gap-2" onClick={startNewChat}>
            <Plus className="size-4" />
            New chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileRailOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="border-b border-border-subtle p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => {
            const items = filtered.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-start gap-1 rounded-lg px-2 py-2 text-left transition-colors duration-150",
                        c.id === activeId ? "bg-surface-2" : "hover:bg-surface-2/60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(c.id);
                          setPendingMessages([]);
                          setVisuallyStopped(false);
                          setMobileRailOpen(false);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          {c.group === "Pinned" ? (
                            <Pin className="size-3 shrink-0 text-accent-brand" />
                          ) : null}
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {c.title ?? "New chat"}
                          </p>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-text-subtle">
                          {formatRelativeTime(c.updatedAt)}
                        </p>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameTarget(c);
                              setRenameValue(c.title ?? "");
                            }}
                          >
                            <Pencil className="mr-2 size-3.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePin(c)}>
                            {c.group === "Pinned" ? (
                              <>
                                <PinOff className="mr-2 size-3.5" /> Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="mr-2 size-3.5" /> Pin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-danger focus:text-danger"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {mobileRailOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileRailOpen(false)}
        />
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileRailOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-foreground">
                {active?.title ?? "New chat"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <StatusPill tone="accent">{activeModel.label}</StatusPill>
                <span className="font-mono text-[10px] text-text-subtle">
                  32 credits used in this chat
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export conversation</DropdownMenuItem>
              <DropdownMenuItem>Clear messages</DropdownMenuItem>
              <DropdownMenuItem className="text-danger focus:text-danger">
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="Start a new conversation"
              description="Ask for hooks, rewrites, outlines or research — CreatorOS keeps your brand voice in context."
            />
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              return (
                <div key={m.id} className="group">
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="relative max-w-[75%]">
                        <div className="rounded-xl bg-accent-brand px-4 py-2.5 text-[13px] leading-relaxed text-primary-foreground">
                          {m.content}
                        </div>
                        <div className="mt-1 flex justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <button className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground">
                            <Pencil className="size-3" /> Edit prompt
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%]">
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground">
                        {m.content}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground">
                          <Copy className="size-3" /> Copy
                        </button>
                        <button className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground">
                          <RefreshCcw className="size-3" /> Regenerate
                        </button>
                        <button className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground">
                          <ThumbsUp className="size-3" /> Like
                        </button>
                        <button className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground">
                          <ThumbsDown className="size-3" /> Dislike
                        </button>
                      </div>
                      {isLast ? (
                        <ContextActions
                          className="mt-3"
                          actions={[
                            { label: "Save to Project", icon: Save },
                            { label: "Convert to Script", icon: FileText },
                            { label: "Convert to Content Idea", icon: Lightbulb },
                            { label: "Create Thumbnail", icon: ImageIcon },
                          ]}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {isGenerating ? (
            <div className="max-w-[85%] space-y-2">
              <GeneratingState label="CreatorOS is thinking" />
              <div className="space-y-1.5">
                <WireLineLocal className="h-2.5 w-full" />
                <WireLineLocal className="h-2.5 w-4/5" />
              </div>
            </div>
          ) : null}
        </div>

        {messages.length === 0 && !isGenerating ? (
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {suggestedPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDraft(p)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-text-muted transition-colors duration-150 hover:border-accent-brand/40 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-border-subtle p-4">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask CreatorOS anything…"
              rows={3}
              className="resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" className="size-8">
                <Paperclip className="size-3.5" />
              </Button>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger className="h-8 w-[170px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={toneValue} onValueChange={setToneValue}>
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-3">
                <CostHint credits={4} />
                {isGenerating ? (
                  <Button size="sm" variant="outline" onClick={stopGeneration} className="gap-1.5">
                    <Square className="size-3.5" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSend} disabled={!draft.trim()} className="gap-1.5">
                    <Send className="size-3.5" /> Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Give this conversation a clearer name.</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title ?? "New chat"}" will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WireLineLocal({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-3/70", className)} />;
}
