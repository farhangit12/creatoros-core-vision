import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  MessagesSquare,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, PageHeader, SectionLabel } from "@/components/app/primitives";
import { WireLine } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listConversations, deleteConversation, clearConversations } from "@/lib/server/ai/chat";
import { listStudioCreations, clearStudioCreations } from "@/lib/server/ai/history";
import { deleteGeneration } from "@/lib/server/ai/ai-usage";
import type { ScriptOption } from "@/lib/ai/types";

const SURFACE_LIMIT = 4;

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Library — CreatorOS AI" },
      { name: "description", content: "Every script, image, thumbnail and chat you've created." },
      { property: "og:title", content: "Library — CreatorOS AI" },
      { property: "og:description", content: "Every script, image, thumbnail and chat you've created." },
    ],
  }),
  component: LibraryPage,
});

type GenerationRow = {
  id: string;
  createdAt: string | Date;
  input: unknown;
  output: unknown;
  assets: { id: string; url: string }[];
};

interface ScriptDetail {
  title: string;
  options: ScriptOption[];
}

interface AssetDetail {
  kind: "image" | "thumbnail";
  prompt: string;
  assets: { id: string; url: string }[];
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 2 }, (_, i) => (
        <WireLine key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onOpen,
  onReedit,
  onDelete,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onOpen: () => void;
  onReedit?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 bg-surface px-4 py-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-text-muted">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <p className="font-mono text-[11px] text-text-subtle">{subtitle}</p>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onReedit ? (
          <Button variant="ghost" size="icon" className="size-7 text-text-subtle hover:text-foreground" onClick={onReedit} aria-label={`Re-edit ${title}`}>
            <PencilLine className="size-3.5" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" className="size-7 text-text-subtle hover:text-danger" onClick={onDelete} aria-label={`Delete ${title}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AssetCard({
  row,
  title,
  onOpen,
  onReedit,
  onDelete,
}: {
  row: GenerationRow;
  title: string;
  onOpen: () => void;
  onReedit: () => void;
  onDelete: () => void;
}) {
  const cover = row.assets[0]?.url;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface">
      <button type="button" onClick={onOpen} className="block aspect-square w-full bg-surface-2">
        {cover ? (
          <img src={cover} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-text-subtle">
            <ImageIcon className="size-5" />
          </div>
        )}
      </button>
      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-foreground">{title}</p>
          <p className="font-mono text-[10px] text-text-subtle">
            {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-6 text-text-subtle hover:text-foreground" onClick={onReedit} aria-label={`Re-edit ${title}`}>
            <PencilLine className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6 text-text-subtle hover:text-danger" onClick={onDelete} aria-label={`Delete ${title}`}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionActions({
  total,
  onViewAll,
  onClearAll,
}: {
  total: number;
  onViewAll: () => void;
  onClearAll: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {total > SURFACE_LIMIT ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[12px] font-normal text-text-subtle hover:text-foreground"
          onClick={onViewAll}
        >
          View all ({total})
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[12px] font-normal text-text-subtle hover:text-danger"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  );
}

function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listConversationsFn = useServerFn(listConversations);
  const { data: conversations, isLoading: loadingChat } = useQuery({
    queryKey: ["library-conversations"],
    queryFn: () => listConversationsFn(),
  });

  const listStudioCreationsFn = useServerFn(listStudioCreations);
  const { data: scripts, isLoading: loadingScripts } = useQuery({
    queryKey: ["library-generations", "script-studio"],
    queryFn: () => listStudioCreationsFn({ data: { feature: "script-studio", operations: ["script.generate"] } }),
  });
  const { data: images, isLoading: loadingImages } = useQuery({
    queryKey: ["library-generations", "image-studio"],
    queryFn: () =>
      listStudioCreationsFn({ data: { feature: "image-studio", operations: ["image.generate", "image.variation"] } }),
  });
  const { data: thumbnails, isLoading: loadingThumbnails } = useQuery({
    queryKey: ["library-generations", "thumbnail-studio"],
    queryFn: () => listStudioCreationsFn({ data: { feature: "thumbnail-studio", operations: ["thumbnail.generate"] } }),
  });

  const deleteConversationFn = useServerFn(deleteConversation);
  const [deleteConversationTarget, setDeleteConversationTarget] = useState<{ id: string; label: string } | null>(null);
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => deleteConversationFn({ data: { conversationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-conversations"] });
      toast.success("Chat deleted");
      setDeleteConversationTarget(null);
    },
    onError: () => toast.error("Couldn't delete that chat. Try again."),
  });

  const deleteGenerationFn = useServerFn(deleteGeneration);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; queryKey: readonly unknown[] } | null>(
    null,
  );
  const deleteGenerationMutation = useMutation({
    mutationFn: (generationId: string) => deleteGenerationFn({ data: { generationId } }),
    onSuccess: () => {
      if (deleteTarget) queryClient.invalidateQueries({ queryKey: deleteTarget.queryKey });
      toast.success("Deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete that. Try again."),
  });

  const [scriptDetail, setScriptDetail] = useState<ScriptDetail | null>(null);
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [viewAllSection, setViewAllSection] = useState<
    "chat" | "script-studio" | "image-studio" | "thumbnail-studio" | null
  >(null);

  type ClearTarget =
    | { type: "chat"; label: string; count: number }
    | {
        type: "generations";
        section: "script-studio" | "image-studio" | "thumbnail-studio";
        feature: "script-studio" | "image-studio" | "thumbnail-studio";
        operations: string[];
        label: string;
        count: number;
        queryKey: readonly unknown[];
      };
  const [clearTarget, setClearTarget] = useState<ClearTarget | null>(null);

  const clearStudioCreationsFn = useServerFn(clearStudioCreations);
  const clearConversationsFn = useServerFn(clearConversations);
  const clearMutation = useMutation({
    mutationFn: (target: ClearTarget) =>
      target.type === "chat"
        ? clearConversationsFn()
        : clearStudioCreationsFn({ data: { feature: target.feature, operations: target.operations } }),
    onSuccess: (_result, target) => {
      const queryKey = target.type === "chat" ? (["library-conversations"] as const) : target.queryKey;
      queryClient.invalidateQueries({ queryKey });
      const clearedSection = target.type === "chat" ? "chat" : target.section;
      setViewAllSection((current) => (current === clearedSection ? null : current));
      toast.success(`Cleared all ${target.label}`);
      setClearTarget(null);
    },
    onError: () => toast.error("Couldn't clear all. Try again."),
  });

  function clearTargetForSection(section: typeof viewAllSection): ClearTarget | null {
    if (section === "chat") {
      return conversations ? { type: "chat", label: "chats", count: conversations.length } : null;
    }
    if (section === "script-studio") {
      return scripts
        ? {
            type: "generations",
            section: "script-studio",
            feature: "script-studio",
            operations: ["script.generate"],
            label: "scripts",
            count: scripts.length,
            queryKey: ["library-generations", "script-studio"],
          }
        : null;
    }
    if (section === "image-studio") {
      return images
        ? {
            type: "generations",
            section: "image-studio",
            feature: "image-studio",
            operations: ["image.generate", "image.variation"],
            label: "images",
            count: images.length,
            queryKey: ["library-generations", "image-studio"],
          }
        : null;
    }
    if (section === "thumbnail-studio") {
      return thumbnails
        ? {
            type: "generations",
            section: "thumbnail-studio",
            feature: "thumbnail-studio",
            operations: ["thumbnail.generate"],
            label: "thumbnails",
            count: thumbnails.length,
            queryKey: ["library-generations", "thumbnail-studio"],
          }
        : null;
    }
    return null;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Organize"
        title="Library"
        description="Every script, image, thumbnail and chat you've created — open, re-edit or remove."
      />

      <section>
        <SectionLabel
          aside={
            conversations ? (
              <SectionActions
                total={conversations.length}
                onViewAll={() => setViewAllSection("chat")}
                onClearAll={() =>
                  setClearTarget({ type: "chat", label: "chats", count: conversations.length })
                }
              />
            ) : undefined
          }
        >
          Chat
        </SectionLabel>
        {loadingChat ? (
          <SkeletonList />
        ) : conversations && conversations.length > 0 ? (
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
            {conversations.slice(0, SURFACE_LIMIT).map((c) => {
              const label = c.title || "Untitled chat";
              return (
                <Row
                  key={c.id}
                  icon={MessagesSquare}
                  title={label}
                  subtitle={formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                  onOpen={() => navigate({ to: "/chat", search: { conversationId: c.id } })}
                  onDelete={() => setDeleteConversationTarget({ id: c.id, label })}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={MessagesSquare} title="No chats yet" description="Conversations you start in AI Chat will show up here." />
        )}
      </section>

      <section>
        <SectionLabel
          aside={
            scripts ? (
              <SectionActions
                total={scripts.length}
                onViewAll={() => setViewAllSection("script-studio")}
                onClearAll={() =>
                  setClearTarget({
                    type: "generations",
                    section: "script-studio",
                    feature: "script-studio",
                    operations: ["script.generate"],
                    label: "scripts",
                    count: scripts.length,
                    queryKey: ["library-generations", "script-studio"],
                  })
                }
              />
            ) : undefined
          }
        >
          Script Studio
        </SectionLabel>
        {loadingScripts ? (
          <SkeletonList />
        ) : scripts && scripts.length > 0 ? (
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
            {scripts.slice(0, SURFACE_LIMIT).map((g) => {
              const input = g.input as { topic?: string; platform?: string } | null;
              const options = ((g.output as ScriptOption[] | null) ?? []).filter(Boolean);
              const label = input?.topic || "Untitled script";
              const subtitle = [input?.platform, formatDistanceToNow(new Date(g.createdAt), { addSuffix: true })]
                .filter(Boolean)
                .join(" · ");
              return (
                <Row
                  key={g.id}
                  icon={FileText}
                  title={label}
                  subtitle={subtitle}
                  onOpen={() => setScriptDetail({ title: label, options })}
                  onReedit={() => navigate({ to: "/script-studio", search: { reedit: g.id } })}
                  onDelete={() => setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "script-studio"] })}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No scripts yet" description="Scripts you generate in Script Studio will show up here." />
        )}
      </section>

      <section>
        <SectionLabel
          aside={
            images ? (
              <SectionActions
                total={images.length}
                onViewAll={() => setViewAllSection("image-studio")}
                onClearAll={() =>
                  setClearTarget({
                    type: "generations",
                    section: "image-studio",
                    feature: "image-studio",
                    operations: ["image.generate", "image.variation"],
                    label: "images",
                    count: images.length,
                    queryKey: ["library-generations", "image-studio"],
                  })
                }
              />
            ) : undefined
          }
        >
          Image Studio
        </SectionLabel>
        {loadingImages ? (
          <SkeletonList />
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.slice(0, SURFACE_LIMIT).map((g) => {
              const input = g.input as { prompt?: string } | null;
              const label = input?.prompt || "Untitled image";
              return (
                <AssetCard
                  key={g.id}
                  row={g}
                  title={label}
                  onOpen={() => setAssetDetail({ kind: "image", prompt: label, assets: g.assets })}
                  onReedit={() => navigate({ to: "/image-studio", search: { reedit: g.id } })}
                  onDelete={() => setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "image-studio"] })}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No images yet" description="Images you generate in Image Studio will show up here." />
        )}
      </section>

      <section>
        <SectionLabel
          aside={
            thumbnails ? (
              <SectionActions
                total={thumbnails.length}
                onViewAll={() => setViewAllSection("thumbnail-studio")}
                onClearAll={() =>
                  setClearTarget({
                    type: "generations",
                    section: "thumbnail-studio",
                    feature: "thumbnail-studio",
                    operations: ["thumbnail.generate"],
                    label: "thumbnails",
                    count: thumbnails.length,
                    queryKey: ["library-generations", "thumbnail-studio"],
                  })
                }
              />
            ) : undefined
          }
        >
          Thumbnail Studio
        </SectionLabel>
        {loadingThumbnails ? (
          <SkeletonList />
        ) : thumbnails && thumbnails.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {thumbnails.slice(0, SURFACE_LIMIT).map((g) => {
              const input = g.input as { topic?: string } | null;
              const label = input?.topic || "Untitled thumbnail";
              return (
                <AssetCard
                  key={g.id}
                  row={g}
                  title={label}
                  onOpen={() => setAssetDetail({ kind: "thumbnail", prompt: label, assets: g.assets })}
                  onReedit={() => navigate({ to: "/thumbnail-studio", search: { reedit: g.id } })}
                  onDelete={() =>
                    setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "thumbnail-studio"] })
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ImageIcon} title="No thumbnails yet" description="Thumbnails you generate in Thumbnail Studio will show up here." />
        )}
      </section>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this creation?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.label}" and any generated assets will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteGenerationMutation.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConversationTarget} onOpenChange={(o) => !o && setDeleteConversationTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConversationTarget?.label}" and all its messages will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConversationTarget && deleteConversationMutation.mutate(deleteConversationTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clearTarget} onOpenChange={(o) => !o && setClearTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all {clearTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {clearTarget?.count} {clearTarget?.label} and any generated assets will be permanently removed.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearTarget && clearMutation.mutate(clearTarget)}>
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!scriptDetail} onOpenChange={(o) => !o && setScriptDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{scriptDetail?.title}</SheetTitle>
            <SheetDescription>Reopened from your original generation — read-only.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {scriptDetail?.options.map((opt) => (
              <div key={opt.key}>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle">{opt.label}</p>
                <div className="mt-2 space-y-4">
                  {opt.sections.map((s) => (
                    <div key={s.id}>
                      <p className="text-[11px] text-text-subtle">{s.label}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!assetDetail} onOpenChange={(o) => !o && setAssetDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{assetDetail?.kind === "image" ? "Image" : "Thumbnail"}</SheetTitle>
            <SheetDescription>{assetDetail?.prompt}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {assetDetail?.assets.map((a) => (
              <img key={a.id} src={a.url} alt="" className="w-full rounded-lg border border-border object-cover" />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewAllSection} onOpenChange={(o) => !o && setViewAllSection(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle>
                  {viewAllSection === "chat"
                    ? "All chats"
                    : viewAllSection === "script-studio"
                      ? "All scripts"
                      : viewAllSection === "image-studio"
                        ? "All images"
                        : "All thumbnails"}
                </SheetTitle>
                <SheetDescription>Every creation in this studio — open, re-edit or remove.</SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-[12px] font-normal text-text-subtle hover:text-danger"
                onClick={() => {
                  const target = clearTargetForSection(viewAllSection);
                  if (target) setClearTarget(target);
                }}
              >
                Clear all
              </Button>
            </div>
          </SheetHeader>
          <div className="mt-6">
            {viewAllSection === "chat" ? (
              conversations && conversations.length > 0 ? (
                <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
                  {conversations.map((c) => {
                    const label = c.title || "Untitled chat";
                    return (
                      <Row
                        key={c.id}
                        icon={MessagesSquare}
                        title={label}
                        subtitle={formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                        onOpen={() => navigate({ to: "/chat", search: { conversationId: c.id } })}
                        onDelete={() => setDeleteConversationTarget({ id: c.id, label })}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={MessagesSquare} title="No chats yet" description="Conversations you start in AI Chat will show up here." />
              )
            ) : null}

            {viewAllSection === "script-studio" ? (
              scripts && scripts.length > 0 ? (
                <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
                  {scripts.map((g) => {
                    const input = g.input as { topic?: string; platform?: string } | null;
                    const options = ((g.output as ScriptOption[] | null) ?? []).filter(Boolean);
                    const label = input?.topic || "Untitled script";
                    const subtitle = [input?.platform, formatDistanceToNow(new Date(g.createdAt), { addSuffix: true })]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <Row
                        key={g.id}
                        icon={FileText}
                        title={label}
                        subtitle={subtitle}
                        onOpen={() => setScriptDetail({ title: label, options })}
                        onReedit={() => navigate({ to: "/script-studio", search: { reedit: g.id } })}
                        onDelete={() =>
                          setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "script-studio"] })
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={FileText} title="No scripts yet" description="Scripts you generate in Script Studio will show up here." />
              )
            ) : null}

            {viewAllSection === "image-studio" ? (
              images && images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((g) => {
                    const input = g.input as { prompt?: string } | null;
                    const label = input?.prompt || "Untitled image";
                    return (
                      <AssetCard
                        key={g.id}
                        row={g}
                        title={label}
                        onOpen={() => setAssetDetail({ kind: "image", prompt: label, assets: g.assets })}
                        onReedit={() => navigate({ to: "/image-studio", search: { reedit: g.id } })}
                        onDelete={() =>
                          setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "image-studio"] })
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Sparkles} title="No images yet" description="Images you generate in Image Studio will show up here." />
              )
            ) : null}

            {viewAllSection === "thumbnail-studio" ? (
              thumbnails && thumbnails.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {thumbnails.map((g) => {
                    const input = g.input as { topic?: string } | null;
                    const label = input?.topic || "Untitled thumbnail";
                    return (
                      <AssetCard
                        key={g.id}
                        row={g}
                        title={label}
                        onOpen={() => setAssetDetail({ kind: "thumbnail", prompt: label, assets: g.assets })}
                        onReedit={() => navigate({ to: "/thumbnail-studio", search: { reedit: g.id } })}
                        onDelete={() =>
                          setDeleteTarget({ id: g.id, label, queryKey: ["library-generations", "thumbnail-studio"] })
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={ImageIcon} title="No thumbnails yet" description="Thumbnails you generate in Thumbnail Studio will show up here." />
              )
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
