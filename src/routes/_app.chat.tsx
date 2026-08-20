import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Send,
  Square,
  Copy,
  RefreshCcw,
  Menu,
  X,
  Download,
  Eraser,
  Paperclip,
  FileText as FileIcon,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/app/primitives";
import { CostHint, GeneratingState } from "@/components/app/studio-kit";
import { tones } from "@/lib/creator-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FILE_SIZE_BYTES, classifyMimeType, formatFileSize } from "@/lib/files";
import { uploadFileToCloudinary } from "@/lib/files-upload-client";
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
  clearConversationMessages,
  deleteConversation,
  getChatAttachmentUploadSignature,
  getConversationMessages,
  listConversations,
  renameConversation,
  sendChatMessage,
  type ConversationRecord,
  type MessageRecord,
} from "@/lib/server/ai/chat";
import { getUserSettings } from "@/lib/server/settings";
import { getCreditBalance } from "@/lib/server/credits";
import { CREDIT_COSTS, isUnlimitedPlan, type PlanId } from "@/lib/credits";
import { hasFeature } from "@/lib/plan-features";
import { PaidFeatureLock } from "@/components/app/paid-feature-gate";
import { useSession } from "@/lib/auth-client";
import { useDraftAutosave } from "@/lib/local-draft-storage";

const SETTINGS_QUERY_KEY = ["user-settings"] as const;

export const Route = createFileRoute("/_app/chat")({
  validateSearch: (search: Record<string, unknown>): { conversationId?: string } => ({
    ...(typeof search["conversationId"] === "string" ? { conversationId: search["conversationId"] } : {}),
  }),
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

type MessageAttachment = { url: string; name: string; mimeType: string };
type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
};

type PendingAttachment = MessageAttachment & { localId: string; uploading: boolean };

// Documents/images only -- video/audio aren't parsed into AI context (no
// transcription pipeline), so offering them here would just be a dead
// control that looks functional but never actually reaches the model.
const CHAT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_ATTACHMENTS_PER_MESSAGE = 5;

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

// Pin state has no DB column (it's a personal client-side preference, not
// shared product data), so it's persisted in localStorage instead of only
// in-memory -- otherwise a reload silently loses it, which reads as broken
// rather than as a real, intentionally-local preference. The active
// conversation is deliberately NOT persisted: opening Chat should always
// start a fresh New Chat, like ChatGPT, rather than reopening whatever was
// last open.
const PINNED_STORAGE_KEY = "creatoros-chat-pinned";

function loadPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // best-effort only -- a full/blocked localStorage shouldn't break chat
  }
}

export default function ChatPage() {
  return <ChatPageImpl />;
}

function ChatPageImpl() {
  const queryClient = useQueryClient();
  const listConversationsFn = useServerFn(listConversations);
  const getMessagesFn = useServerFn(getConversationMessages);
  const sendMessageFn = useServerFn(sendChatMessage);
  const renameConversationFn = useServerFn(renameConversation);
  const deleteConversationFn = useServerFn(deleteConversation);
  const clearMessagesFn = useServerFn(clearConversationMessages);
  const getUserSettingsFn = useServerFn(getUserSettings);
  const getAttachmentSignatureFn = useServerFn(getChatAttachmentUploadSignature);
  const getCreditBalanceFn = useServerFn(getCreditBalance);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinnedIds());
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const [draft, setDraft] = useState("");
  const [pendingMessages, setPendingMessages] = useState<DisplayMessage[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visuallyStopped, setVisuallyStopped] = useState(false);
  const [toneValue, setToneValue] = useState<string>(tones[0]!);

  const { data: settings } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });

  const { data: creditAccount } = useQuery({
    queryKey: ["credit-balance"],
    queryFn: () => getCreditBalanceFn(),
  });
  const planId = (creditAccount?.planId as PlanId | undefined) ?? "free";
  const planUnlimited = isUnlimitedPlan(planId);
  const canAttach = hasFeature(planId, "chat.attachments");
  const insufficientCredits =
    creditAccount && !planUnlimited ? creditAccount.balance < CREDIT_COSTS.chat : false;
  useEffect(() => {
    if (settings?.defaultAiTone && tones.includes(settings.defaultAiTone)) {
      setToneValue(settings.defaultAiTone);
    }
  }, [settings?.userId]);

  const navigate = useNavigate();
  const { data: session } = useSession();
  const routeSearch = Route.useSearch();

  // Opens a specific past conversation when navigated here from the Library
  // page (?conversationId=...) -- distinct from the deliberate "always fresh
  // New Chat" default above, which only applies when no conversation was
  // explicitly requested.
  useEffect(() => {
    if (!routeSearch.conversationId) return;
    setActiveId(routeSearch.conversationId);
    void navigate({ to: "/chat", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSearch.conversationId]);

  const { clearDraft } = useDraftAutosave<{ text: string }>({
    userId: session?.user?.id,
    feature: "chat",
    enabled: settings?.autosaveDrafts ?? true,
    value: { text: draft },
    onRestore: (d) => {
      if (d.text) setDraft(d.text);
    },
  });

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
    retry: false,
  });

  // The last-active conversation is restored from localStorage on load; if it
  // was deleted (this session or another) or never resolves, fall back to the
  // empty state instead of getting stuck on a permanent error/blank panel.
  useEffect(() => {
    if (messagesQuery.isError && activeId) {
      setActiveId(null);
      setPendingMessages([]);
    }
  }, [messagesQuery.isError, activeId]);

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

  const persistedMessages: DisplayMessage[] = (messagesQuery.data ?? []).map((m: MessageRecord) => {
    const metadata = m.metadata as { attachments?: MessageAttachment[] } | null;
    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      ...(metadata?.attachments?.length ? { attachments: metadata.attachments } : {}),
    };
  });
  const messages: DisplayMessage[] = [...persistedMessages, ...pendingMessages];

  const sendMutation = useMutation({
    mutationFn: (vars: {
      content: string;
      conversationId?: string;
      tone?: string;
      attachments?: MessageAttachment[];
    }) => sendMessageFn({ data: vars }),
    onSuccess: async (result) => {
      const wasNew = !activeId;
      await queryClient.fetchQuery({
        queryKey: chatMessagesKey(result.conversationId),
        queryFn: () => getMessagesFn({ data: { conversationId: result.conversationId } }),
      });
      if (wasNew) setActiveId(result.conversationId);
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      setPendingMessages([]);
      setVisuallyStopped(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't send that message. Try again.");
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
      savePinnedIds(next);
      return next;
    });
  }

  const renameMutation = useMutation({
    mutationFn: (vars: { conversationId: string; title: string }) => renameConversationFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
      setRenameTarget(null);
    },
    onError: () => toast.error("Couldn't rename that chat. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { conversationId: string }) => deleteConversationFn({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
      if (activeId === vars.conversationId) setActiveId(null);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete that chat. Try again."),
  });

  const clearMutation = useMutation({
    mutationFn: (vars: { conversationId: string }) => clearMessagesFn({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: chatMessagesKey(vars.conversationId) });
      setClearConfirmOpen(false);
    },
    onError: () => toast.error("Couldn't clear messages. Try again."),
  });

  function exportConversation() {
    if (!active || messages.length === 0) return;
    const lines = messages.map((m) => `${m.role === "user" ? "You" : "CreatorOS"}: ${m.content}`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(active.title ?? "chat").replace(/[^a-z0-9-_]+/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function confirmRename() {
    if (!renameTarget || !renameValue.trim()) return;
    renameMutation.mutate({ conversationId: renameTarget.id, title: renameValue.trim() });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ conversationId: deleteTarget.id });
  }

  function handleSend() {
    const content = draft.trim();
    const readyAttachments = pendingAttachments.filter((a) => !a.uploading);
    const hasAttachments = readyAttachments.length > 0;
    const stillUploading = pendingAttachments.length > readyAttachments.length;
    if ((!content && !hasAttachments) || stillUploading || sendMutation.isPending) return;

    const attachments: MessageAttachment[] = readyAttachments.map(({ url, name, mimeType }) => ({
      url,
      name,
      mimeType,
    }));
    setPendingMessages([
      { id: `local-${Date.now()}`, role: "user", content, ...(hasAttachments ? { attachments } : {}) },
    ]);
    setVisuallyStopped(false);
    setDraft("");
    clearDraft();
    setPendingAttachments([]);
    sendMutation.mutate({
      content,
      ...(activeId ? { conversationId: activeId } : {}),
      ...(toneValue ? { tone: toneValue } : {}),
      ...(hasAttachments ? { attachments } : {}),
    });
  }

  function stopGeneration() {
    setVisuallyStopped(true);
  }

  function startNewChat() {
    setActiveId(null);
    setPendingMessages([]);
    setPendingAttachments([]);
    setVisuallyStopped(false);
    setDraft("");
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (pendingAttachments.length + files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
      return;
    }

    for (const file of files) {
      if (!CHAT_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name}: file is too large (max ${formatFileSize(MAX_FILE_SIZE_BYTES)}).`);
        continue;
      }

      const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPendingAttachments((prev) => [
        ...prev,
        { localId, url: "", name: file.name, mimeType: file.type, uploading: true },
      ]);

      try {
        const signature = await getAttachmentSignatureFn();
        const result = await uploadFileToCloudinary(file, signature, () => {});
        setPendingAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, url: result.url, uploading: false } : a)),
        );
      } catch {
        toast.error(`Couldn't upload ${file.name}.`);
        setPendingAttachments((prev) => prev.filter((a) => a.localId !== localId));
      }
    }
  }

  function removeAttachment(localId: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }

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
            aria-label="Close chat list"
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
                            aria-label={`More options for ${c.title ?? "New chat"}`}
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
              aria-label="Open chat list"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-foreground">
                {active?.title ?? "New chat"}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={!active} aria-label="Chat options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportConversation} disabled={messages.length === 0}>
                <Download className="mr-2 size-3.5" /> Export conversation
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setClearConfirmOpen(true)}
                disabled={messages.length === 0}
              >
                <Eraser className="mr-2 size-3.5" /> Clear messages
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={() => active && setDeleteTarget(active)}
              >
                <Trash2 className="mr-2 size-3.5" /> Delete chat
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
              const precedingUserMessage = m.role === "assistant" ? messages[i - 1] : undefined;
              return (
                <div key={m.id} className="group">
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="relative max-w-[75%]">
                        {m.attachments?.length ? (
                          <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
                            {m.attachments.map((a) => (
                              <a
                                key={a.url}
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] text-text-muted transition-colors hover:border-accent-brand/40 hover:text-foreground"
                              >
                                {a.mimeType.startsWith("image/") ? (
                                  <ImageIcon className="size-3" />
                                ) : (
                                  <FileIcon className="size-3" />
                                )}
                                <span className="max-w-[140px] truncate">{a.name}</span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {m.content ? (
                          <div className="rounded-xl bg-accent-brand px-4 py-2.5 text-[13px] leading-relaxed text-primary-foreground">
                            {m.content}
                          </div>
                        ) : null}
                        <div className="mt-1 flex justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setDraft(m.content)}
                            className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground"
                          >
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
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content).then(
                              () => toast.success("Copied to clipboard"),
                              () => toast.error("Couldn't copy — check clipboard permissions."),
                            );
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground"
                        >
                          <Copy className="size-3" /> Copy
                        </button>
                        {precedingUserMessage ? (
                          <button
                            type="button"
                            disabled={sendMutation.isPending}
                            onClick={() => {
                              setPendingMessages([
                                { id: `local-${Date.now()}`, role: "user", content: precedingUserMessage.content },
                              ]);
                              sendMutation.mutate({
                                content: precedingUserMessage.content,
                                ...(activeId ? { conversationId: activeId } : {}),
                                ...(toneValue ? { tone: toneValue } : {}),
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-foreground disabled:opacity-50"
                          >
                            <RefreshCcw className="size-3" /> Regenerate
                          </button>
                        ) : null}
                      </div>
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
            {pendingAttachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingAttachments.map((a) => (
                  <span
                    key={a.localId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-text-muted"
                  >
                    {a.uploading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : a.mimeType.startsWith("image/") ? (
                      <ImageIcon className="size-3" />
                    ) : (
                      <FileIcon className="size-3" />
                    )}
                    <span className="max-w-[140px] truncate">{a.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.localId)}
                      className="text-text-subtle hover:text-danger"
                      aria-label={`Remove ${a.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={CHAT_ATTACHMENT_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PaidFeatureLock enabled={canAttach} label="file attachments">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-text-subtle hover:text-foreground"
                  onClick={() => canAttach && fileInputRef.current?.click()}
                  aria-label="Attach files"
                  disabled={!canAttach}
                >
                  <Paperclip className="size-4" />
                </Button>
              </PaidFeatureLock>
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
                <CostHint credits={CREDIT_COSTS.chat} balance={planUnlimited ? undefined : creditAccount?.balance} />
                {isGenerating ? (
                  <Button size="sm" variant="outline" onClick={stopGeneration} className="gap-1.5">
                    <Square className="size-3.5" /> Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={
                      (!draft.trim() && pendingAttachments.length === 0) ||
                      pendingAttachments.some((a) => a.uploading) ||
                      insufficientCredits
                    }
                    className="gap-1.5"
                  >
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

      {/* Clear messages alert */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all messages?</AlertDialogTitle>
            <AlertDialogDescription>
              Every message in "{active?.title ?? "New chat"}" will be permanently removed. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => activeId && clearMutation.mutate({ conversationId: activeId })}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WireLineLocal({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-3/70", className)} />;
}
