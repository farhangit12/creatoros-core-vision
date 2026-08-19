import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ChevronLeft,
  Share2,
  Copy,
  Archive,
  Settings as SettingsIcon,
  FileText,
  Image as ImageIcon,
  Clapperboard,
  Files as FilesIcon,
  MessagesSquare,
  Plus,
  Upload,
  Trash2,
  ExternalLink,
  Link2,
  Unlink,
  Loader2,
  History,
} from "lucide-react";
import { EmptyState } from "@/components/app/primitives";
import { ContextActions, StatusPill, WireLine, type StateTone } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  deleteProject,
  duplicateProject,
  getProject,
  setProjectArchived,
  updateProject,
} from "@/lib/server/projects";
import {
  getProjectOverview,
  linkAssetToProject,
  linkChatToProject,
  linkFileToProject,
  linkScriptToProject,
  listLinkableChats,
  listLinkableFiles,
  listLinkableImages,
  listLinkableScripts,
  listLinkableThumbnails,
  listProjectActivity,
  listProjectChats,
  listProjectFiles,
  listProjectImages,
  listProjectScripts,
  listProjectThumbnails,
  unlinkAssetFromProject,
  unlinkChatFromProject,
  unlinkFileFromProject,
  unlinkScriptFromProject,
} from "@/lib/server/project-content";
import { createFileRecord, getUploadSignature } from "@/lib/server/files";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, classifyMimeType, formatFileSize } from "@/lib/files";
import { uploadFileToCloudinary } from "@/lib/files-upload-client";
import type { ScriptOption } from "@/lib/ai/types";

export const Route = createFileRoute("/_app/projects/$projectId")({
  head: ({ params }) => ({
    meta: [
      { title: `${projectTitle(params.projectId)} — CreatorOS AI` },
      { name: "description", content: "Project workspace: assets, scripts, files, chats and activity in one place." },
      { property: "og:title", content: `${projectTitle(params.projectId)} — CreatorOS AI` },
      { property: "og:description", content: "Project workspace: assets, scripts, files, chats and activity in one place." },
    ],
  }),
  component: ProjectDetailPage,
});

function projectTitle(id: string) {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const statusTone: Record<string, StateTone> = {
  Idea: "neutral",
  "In progress": "accent",
  Review: "warning",
  Published: "success",
  Archived: "neutral",
};

function timeAgo(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

/** Generic row for linked content (scripts / files / chats). */
function ContentRow({
  title,
  meta,
  onOpen,
  onUnlink,
  unlinking,
}: {
  title: string;
  meta: string;
  onOpen?: (() => void) | undefined;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
        <p className="font-mono text-[11px] text-text-subtle">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onOpen ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open ${title}`}
            className="size-7 text-text-subtle hover:text-foreground"
            onClick={onOpen}
          >
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Unlink ${title}`}
          className="size-7 text-text-subtle hover:text-danger"
          onClick={onUnlink}
          disabled={unlinking}
        >
          <Unlink className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Generic "attach something you already made" picker. */
function LinkExistingDialog<T extends { id: string }>({
  open,
  onOpenChange,
  title,
  items,
  isLoading,
  renderLabel,
  renderMeta,
  onLink,
  linkingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: T[];
  isLoading: boolean;
  renderLabel: (item: T) => string;
  renderMeta: (item: T) => string;
  onLink: (item: T) => void;
  linkingId: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Attach something you already created to this project.</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto py-2">
          {isLoading ? (
            <p className="py-6 text-center text-[13px] text-text-subtle">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-text-subtle">
              Nothing unlinked is available yet.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground">{renderLabel(item)}</p>
                  <p className="font-mono text-[11px] text-text-subtle">{renderMeta(item)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={linkingId === item.id}
                  onClick={() => onLink(item)}
                >
                  {linkingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : "Link"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getProjectFn = useServerFn(getProject);
  const updateProjectFn = useServerFn(updateProject);
  const setArchivedFn = useServerFn(setProjectArchived);
  const duplicateProjectFn = useServerFn(duplicateProject);
  const deleteProjectFn = useServerFn(deleteProject);

  const getProjectOverviewFn = useServerFn(getProjectOverview);
  const listProjectScriptsFn = useServerFn(listProjectScripts);
  const listProjectImagesFn = useServerFn(listProjectImages);
  const listProjectThumbnailsFn = useServerFn(listProjectThumbnails);
  const listProjectFilesFn = useServerFn(listProjectFiles);
  const listProjectChatsFn = useServerFn(listProjectChats);
  const listProjectActivityFn = useServerFn(listProjectActivity);
  const listLinkableScriptsFn = useServerFn(listLinkableScripts);
  const listLinkableImagesFn = useServerFn(listLinkableImages);
  const listLinkableThumbnailsFn = useServerFn(listLinkableThumbnails);
  const listLinkableFilesFn = useServerFn(listLinkableFiles);
  const listLinkableChatsFn = useServerFn(listLinkableChats);
  const linkScriptToProjectFn = useServerFn(linkScriptToProject);
  const unlinkScriptFromProjectFn = useServerFn(unlinkScriptFromProject);
  const linkAssetToProjectFn = useServerFn(linkAssetToProject);
  const unlinkAssetFromProjectFn = useServerFn(unlinkAssetFromProject);
  const linkFileToProjectFn = useServerFn(linkFileToProject);
  const unlinkFileFromProjectFn = useServerFn(unlinkFileFromProject);
  const linkChatToProjectFn = useServerFn(linkChatToProject);
  const unlinkChatFromProjectFn = useServerFn(unlinkChatFromProject);
  const getUploadSignatureFn = useServerFn(getUploadSignature);
  const createFileRecordFn = useServerFn(createFileRecord);

  const projectQueryKey = ["projects", projectId] as const;

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: projectQueryKey,
    queryFn: () => getProjectFn({ data: { id: projectId } }),
    retry: false,
  });

  function invalidateProjectData() {
    queryClient.invalidateQueries({ queryKey: projectQueryKey });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  function invalidateContent() {
    queryClient.invalidateQueries({ queryKey: ["project-content", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-overview", projectId] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateProjectFn>[0]) => updateProjectFn(input),
    onSuccess: () => {
      invalidateProjectData();
      toast.success("Settings saved");
    },
    onError: () => toast.error("Couldn't save changes. Try again."),
  });

  const archiveMutation = useMutation({
    mutationFn: (archived: boolean) => setArchivedFn({ data: { id: projectId, archived } }),
    onSuccess: () => {
      invalidateProjectData();
      toast("Project archive status updated");
    },
    onError: () => toast.error("Couldn't update the project. Try again."),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateProjectFn({ data: { id: projectId } }),
    onSuccess: (created) => {
      invalidateProjectData();
      toast.success("Project duplicated", { description: created.name });
    },
    onError: () => toast.error("Couldn't duplicate the project. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectFn({ data: { id: projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast("Project deleted");
      navigate({ to: "/projects" });
    },
    onError: () => toast.error("Couldn't delete the project. Try again."),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setTags(project.tags.join(", "));
      setVisibility(project.visibility);
    }
  }, [project?.id]);

  function saveSettings() {
    updateMutation.mutate({
      data: {
        id: projectId,
        name: name.trim() || undefined,
        description: description.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        visibility: visibility as "private" | "team" | "public",
      },
    });
  }

  // ---- Overview stats ----
  const { data: overview } = useQuery({
    queryKey: ["project-overview", projectId],
    queryFn: () => getProjectOverviewFn({ data: { projectId } }),
    enabled: Boolean(project),
  });

  // ---- Linked content, fetched per-tab ----
  const scriptsQuery = useQuery({
    queryKey: ["project-content", projectId, "scripts"],
    queryFn: () => listProjectScriptsFn({ data: { projectId } }),
    enabled: tab === "scripts",
  });
  const imagesQuery = useQuery({
    queryKey: ["project-content", projectId, "images"],
    queryFn: () => listProjectImagesFn({ data: { projectId } }),
    enabled: tab === "images",
  });
  const thumbnailsQuery = useQuery({
    queryKey: ["project-content", projectId, "thumbnails"],
    queryFn: () => listProjectThumbnailsFn({ data: { projectId } }),
    enabled: tab === "thumbnails",
  });
  const filesQuery = useQuery({
    queryKey: ["project-content", projectId, "files"],
    queryFn: () => listProjectFilesFn({ data: { projectId } }),
    enabled: tab === "files",
  });
  const chatsQuery = useQuery({
    queryKey: ["project-content", projectId, "chats"],
    queryFn: () => listProjectChatsFn({ data: { projectId } }),
    enabled: tab === "chats",
  });
  const activityQuery = useQuery({
    queryKey: ["project-content", projectId, "activity"],
    queryFn: () => listProjectActivityFn({ data: { projectId } }),
    enabled: tab === "activity",
  });

  // ---- Link-existing dialogs ----
  const [linkDialog, setLinkDialog] = useState<null | "scripts" | "images" | "thumbnails" | "files" | "chats">(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const linkableScriptsQuery = useQuery({
    queryKey: ["project-linkable", projectId, "scripts"],
    queryFn: () => listLinkableScriptsFn({ data: { projectId } }),
    enabled: linkDialog === "scripts",
  });
  const linkableImagesQuery = useQuery({
    queryKey: ["project-linkable", projectId, "images"],
    queryFn: () => listLinkableImagesFn({ data: { projectId } }),
    enabled: linkDialog === "images",
  });
  const linkableThumbnailsQuery = useQuery({
    queryKey: ["project-linkable", projectId, "thumbnails"],
    queryFn: () => listLinkableThumbnailsFn({ data: { projectId } }),
    enabled: linkDialog === "thumbnails",
  });
  const linkableFilesQuery = useQuery({
    queryKey: ["project-linkable", projectId, "files"],
    queryFn: () => listLinkableFilesFn({ data: { projectId } }),
    enabled: linkDialog === "files",
  });
  const linkableChatsQuery = useQuery({
    queryKey: ["project-linkable", projectId, "chats"],
    queryFn: () => listLinkableChatsFn({ data: { projectId } }),
    enabled: linkDialog === "chats",
  });

  async function handleLinkScript(item: { id: string }) {
    setLinkingId(item.id);
    try {
      await linkScriptToProjectFn({ data: { generationId: item.id, projectId } });
      invalidateContent();
      queryClient.invalidateQueries({ queryKey: ["project-linkable", projectId, "scripts"] });
      toast.success("Script linked");
    } catch {
      toast.error("Couldn't link that script.");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleLinkAsset(item: { id: string }) {
    setLinkingId(item.id);
    try {
      await linkAssetToProjectFn({ data: { assetId: item.id, projectId } });
      invalidateContent();
      queryClient.invalidateQueries({ queryKey: ["project-linkable", projectId, "images"] });
      queryClient.invalidateQueries({ queryKey: ["project-linkable", projectId, "thumbnails"] });
      toast.success("Linked");
    } catch {
      toast.error("Couldn't link that asset.");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleLinkFile(item: { id: string }) {
    setLinkingId(item.id);
    try {
      await linkFileToProjectFn({ data: { fileId: item.id, projectId } });
      invalidateContent();
      queryClient.invalidateQueries({ queryKey: ["project-linkable", projectId, "files"] });
      toast.success("File linked");
    } catch {
      toast.error("Couldn't link that file.");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleLinkChat(item: { id: string }) {
    setLinkingId(item.id);
    try {
      await linkChatToProjectFn({ data: { conversationId: item.id, projectId } });
      invalidateContent();
      queryClient.invalidateQueries({ queryKey: ["project-linkable", projectId, "chats"] });
      toast.success("Chat linked");
    } catch {
      toast.error("Couldn't link that chat.");
    } finally {
      setLinkingId(null);
    }
  }

  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  async function unlinkScript(generationId: string) {
    setUnlinkingId(generationId);
    try {
      await unlinkScriptFromProjectFn({ data: { generationId, projectId } });
      invalidateContent();
    } catch {
      toast.error("Couldn't unlink that script.");
    } finally {
      setUnlinkingId(null);
    }
  }

  async function unlinkAsset(assetId: string) {
    setUnlinkingId(assetId);
    try {
      await unlinkAssetFromProjectFn({ data: { assetId, projectId } });
      invalidateContent();
    } catch {
      toast.error("Couldn't unlink that.");
    } finally {
      setUnlinkingId(null);
    }
  }

  async function unlinkFile(fileId: string) {
    setUnlinkingId(fileId);
    try {
      await unlinkFileFromProjectFn({ data: { fileId, projectId } });
      invalidateContent();
    } catch {
      toast.error("Couldn't unlink that file.");
    } finally {
      setUnlinkingId(null);
    }
  }

  async function unlinkChat(conversationId: string) {
    setUnlinkingId(conversationId);
    try {
      await unlinkChatFromProjectFn({ data: { conversationId, projectId } });
      invalidateContent();
    } catch {
      toast.error("Couldn't unlink that chat.");
    } finally {
      setUnlinkingId(null);
    }
  }

  // ---- Script preview ----
  const [scriptPreview, setScriptPreview] = useState<{ title: string; options: ScriptOption[] } | null>(null);

  // ---- Live file upload ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadProjectFile(file: File) {
    const classification = classifyMimeType(file.type);
    if (!classification) {
      toast.error(`"${file.name}" isn't a supported file type.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`"${file.name}" is larger than the ${formatFileSize(MAX_FILE_SIZE_BYTES)} limit.`);
      return;
    }
    setUploading(true);
    try {
      const signature = await getUploadSignatureFn();
      const result = await uploadFileToCloudinary(file, signature, () => {});
      await createFileRecordFn({
        data: {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url: result.url,
          storageKey: result.storageKey,
          projectId,
          ...(result.width ? { width: result.width } : {}),
          ...(result.height ? { height: result.height } : {}),
        },
      });
      invalidateContent();
      toast.success(`"${file.name}" uploaded`);
    } catch (error) {
      toast.error(`Couldn't upload "${file.name}"`, {
        description: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  }

  function uploadProjectFiles(fileList: FileList | File[]) {
    Array.from(fileList).forEach((file) => void uploadProjectFile(file));
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4 border-b border-border-subtle pb-6">
          <WireLine className="h-4 w-32" />
          <WireLine className="h-8 w-72" />
          <WireLine className="h-2 w-40" />
        </div>
        <WireLine className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Project not found"
        description="This project doesn't exist, or you don't have access to it."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">Back to projects</Link>
          </Button>
        }
      />
    );
  }

  const title = project.name;
  const status = project.status;

  return (
    <div className="space-y-8">
      <div className="space-y-4 border-b border-border-subtle pb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Back to projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-medium tracking-[-0.03em] text-foreground">{title}</h1>
              <StatusPill tone={statusTone[status]}>{status}</StatusPill>
              {project.template ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                  {project.template}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={project.progress} className="h-1.5 w-40" />
              <span className="font-mono text-[11px] text-text-subtle">
                {project.progress}% · updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Share2 className="size-3.5" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              <Copy className="size-3.5" /> Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => archiveMutation.mutate(!project.archived)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="size-3.5" /> {project.archived ? "Unarchive" : "Archive"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("settings")}>
              <SettingsIcon className="size-3.5" /> Settings
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Assets</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">{overview?.assetsCount ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Scripts</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">{overview?.scriptsCount ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Files</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">{overview?.filesCount ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Description</p>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              {project.description || "No description yet."}
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Next scheduled</p>
            {overview?.nextMilestone ? (
              <p className="mt-2 text-[13px] text-text-muted">
                {overview.nextMilestone.title} — {formatDistanceToNow(new Date(overview.nextMilestone.scheduledAt), { addSuffix: true })}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-text-muted">
                Nothing scheduled yet.{" "}
                <Link to="/content-planner" className="text-accent-brand hover:underline">
                  Plan something
                </Link>
              </p>
            )}
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Quick actions</p>
            <ContextActions
              actions={[
                { label: "New script", icon: FileText, onClick: () => navigate({ to: "/script-studio" }) },
                { label: "Generate thumbnail", icon: Clapperboard, onClick: () => navigate({ to: "/thumbnail-studio" }) },
                { label: "Upload file", icon: Upload, onClick: () => setTab("files") },
                { label: "Open chat", icon: MessagesSquare, onClick: () => navigate({ to: "/chat" }) },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="space-y-3 pt-6">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog("scripts")}>
              <Link2 className="size-3.5" /> Link existing
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/script-studio">
                <Plus className="size-3.5" /> New script
              </Link>
            </Button>
          </div>
          {scriptsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <WireLine key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !scriptsQuery.data || scriptsQuery.data.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No scripts linked to this project"
              description="Generate a new script or link one you've already made."
            />
          ) : (
            scriptsQuery.data.map((s) => {
              const options = (s.output as unknown as ScriptOption[] | null) ?? [];
              const inputRecord = s.input as Record<string, unknown> | null;
              const topic = typeof inputRecord?.["topic"] === "string" ? (inputRecord["topic"] as string) : "Script";
              return (
                <ContentRow
                  key={s.id}
                  title={topic}
                  meta={`${s.status} · ${timeAgo(s.createdAt)}`}
                  onOpen={options.length > 0 ? () => setScriptPreview({ title: topic, options }) : undefined}
                  onUnlink={() => unlinkScript(s.id)}
                  unlinking={unlinkingId === s.id}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="images" className="pt-6">
          <div className="mb-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog("images")}>
              <Link2 className="size-3.5" /> Link existing
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/image-studio">
                <Plus className="size-3.5" /> New image
              </Link>
            </Button>
          </div>
          {imagesQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <WireLine key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : !imagesQuery.data || imagesQuery.data.length === 0 ? (
            <EmptyState icon={ImageIcon} title="No images yet" description="Generate or link an image to see it here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {imagesQuery.data.map((img) => (
                <div key={img.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <img src={img.url} alt={img.prompt ?? "Generated image"} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{img.prompt ?? "Untitled"}</p>
                      <p className="font-mono text-[11px] text-text-subtle">
                        {img.width && img.height ? `${img.width}×${img.height}` : timeAgo(img.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open ${img.prompt ?? "image"}`}
                        className="size-7 text-text-subtle hover:text-foreground"
                        onClick={() => window.open(img.url, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Unlink ${img.prompt ?? "image"}`}
                        className="size-7 text-text-subtle hover:text-danger"
                        onClick={() => unlinkAsset(img.id)}
                        disabled={unlinkingId === img.id}
                      >
                        <Unlink className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="thumbnails" className="pt-6">
          <div className="mb-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog("thumbnails")}>
              <Link2 className="size-3.5" /> Link existing
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/thumbnail-studio">
                <Plus className="size-3.5" /> New thumbnail
              </Link>
            </Button>
          </div>
          {thumbnailsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <WireLine key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : !thumbnailsQuery.data || thumbnailsQuery.data.length === 0 ? (
            <EmptyState icon={Clapperboard} title="No thumbnails yet" description="Generate or link a thumbnail to see it here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {thumbnailsQuery.data.map((t) => (
                <div key={t.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <img src={t.url} alt={t.prompt ?? "Generated thumbnail"} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{t.prompt ?? "Untitled"}</p>
                      <p className="font-mono text-[11px] text-text-subtle">
                        {t.width && t.height ? `${t.width}×${t.height}` : timeAgo(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open ${t.prompt ?? "thumbnail"}`}
                        className="size-7 text-text-subtle hover:text-foreground"
                        onClick={() => window.open(t.url, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Unlink ${t.prompt ?? "thumbnail"}`}
                        className="size-7 text-text-subtle hover:text-danger"
                        onClick={() => unlinkAsset(t.id)}
                        disabled={unlinkingId === t.id}
                      >
                        <Unlink className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-4 pt-6">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog("files")}>
              <Link2 className="size-3.5" /> Link existing
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) uploadProjectFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) uploadProjectFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center transition-colors",
              dragOver && "border-accent-brand bg-accent-tint",
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin text-text-subtle" />
            ) : (
              <Upload className="size-5 text-text-subtle" />
            )}
            <p className="text-[13px] text-foreground">Drag a file here or click to browse</p>
            <p className="font-mono text-[11px] text-text-subtle">up to {formatFileSize(MAX_FILE_SIZE_BYTES)}</p>
          </div>
          {filesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <WireLine key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !filesQuery.data || filesQuery.data.length === 0 ? (
            <EmptyState icon={FilesIcon} title="No files linked to this project" description="Upload one above or link a file you've already added to your workspace." />
          ) : (
            filesQuery.data.map((f) => (
              <ContentRow
                key={f.id}
                title={f.name}
                meta={`${formatFileSize(f.size)} · ${timeAgo(f.createdAt)}`}
                onOpen={() => window.open(f.url, "_blank", "noopener,noreferrer")}
                onUnlink={() => unlinkFile(f.id)}
                unlinking={unlinkingId === f.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="chats" className="pt-6">
          <div className="mb-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog("chats")}>
              <Link2 className="size-3.5" /> Link existing
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/chat">
                <Plus className="size-3.5" /> New chat
              </Link>
            </Button>
          </div>
          {chatsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <WireLine key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !chatsQuery.data || chatsQuery.data.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No chats linked to this project" description="Start a conversation and link it here, or attach an existing one." />
          ) : (
            <div className="space-y-3">
              {chatsQuery.data.map((c) => (
                <ContentRow
                  key={c.id}
                  title={c.title ?? "Untitled conversation"}
                  meta={`Updated ${timeAgo(c.updatedAt)}`}
                  onOpen={() => navigate({ to: "/chat" })}
                  onUnlink={() => unlinkChat(c.id)}
                  unlinking={unlinkingId === c.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          {activityQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <WireLine key={i} className="h-6 w-2/3" />
              ))}
            </div>
          ) : !activityQuery.data || activityQuery.data.length === 0 ? (
            <EmptyState icon={History} title="Nothing has happened yet" description="Linking content, saving settings and archiving will appear here as a real, chronological trail." />
          ) : (
            <ol className="space-y-5 border-l border-border-subtle pl-5">
              {activityQuery.data.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-accent-brand" />
                  <p className="text-[13px] text-foreground">
                    {a.action}
                    {a.detail ? <span className="text-text-muted"> — {a.detail}</span> : null}
                  </p>
                  <p className="font-mono text-[11px] text-text-subtle">{timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 pt-6">
          <div className="max-w-lg space-y-4 rounded-xl border border-border bg-surface p-5">
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Tags</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="public">Public link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={saveSettings} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>

          <div className="max-w-lg space-y-4 rounded-xl border border-danger/30 bg-danger/5 p-5">
            <p className="text-[13px] font-medium text-foreground">Danger zone</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-foreground">Archive this project</p>
                <p className="text-[12px] text-text-subtle">Hide it from the active list without deleting anything.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate(!project.archived)}
                disabled={archiveMutation.isPending}
              >
                {project.archived ? "Unarchive" : "Archive"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-danger/20 pt-4">
              <div>
                <p className="text-[13px] text-foreground">Delete this project</p>
                <p className="text-[12px] text-text-subtle">Permanently remove the project and all associated assets.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <LinkExistingDialog
        open={linkDialog === "scripts"}
        onOpenChange={(open) => setLinkDialog(open ? "scripts" : null)}
        title="Link an existing script"
        items={linkableScriptsQuery.data ?? []}
        isLoading={linkableScriptsQuery.isLoading}
        renderLabel={(s) => {
          const input = s.input as Record<string, unknown> | null;
          return typeof input?.["topic"] === "string" ? (input["topic"] as string) : "Script";
        }}
        renderMeta={(s) => timeAgo(s.createdAt)}
        onLink={handleLinkScript}
        linkingId={linkingId}
      />
      <LinkExistingDialog
        open={linkDialog === "images"}
        onOpenChange={(open) => setLinkDialog(open ? "images" : null)}
        title="Link an existing image"
        items={linkableImagesQuery.data ?? []}
        isLoading={linkableImagesQuery.isLoading}
        renderLabel={(a) => a.prompt ?? "Untitled image"}
        renderMeta={(a) => timeAgo(a.createdAt)}
        onLink={handleLinkAsset}
        linkingId={linkingId}
      />
      <LinkExistingDialog
        open={linkDialog === "thumbnails"}
        onOpenChange={(open) => setLinkDialog(open ? "thumbnails" : null)}
        title="Link an existing thumbnail"
        items={linkableThumbnailsQuery.data ?? []}
        isLoading={linkableThumbnailsQuery.isLoading}
        renderLabel={(a) => a.prompt ?? "Untitled thumbnail"}
        renderMeta={(a) => timeAgo(a.createdAt)}
        onLink={handleLinkAsset}
        linkingId={linkingId}
      />
      <LinkExistingDialog
        open={linkDialog === "files"}
        onOpenChange={(open) => setLinkDialog(open ? "files" : null)}
        title="Link an existing file"
        items={linkableFilesQuery.data ?? []}
        isLoading={linkableFilesQuery.isLoading}
        renderLabel={(f) => f.name}
        renderMeta={(f) => `${formatFileSize(f.size)} · ${timeAgo(f.createdAt)}`}
        onLink={handleLinkFile}
        linkingId={linkingId}
      />
      <LinkExistingDialog
        open={linkDialog === "chats"}
        onOpenChange={(open) => setLinkDialog(open ? "chats" : null)}
        title="Link an existing chat"
        items={linkableChatsQuery.data ?? []}
        isLoading={linkableChatsQuery.isLoading}
        renderLabel={(c) => c.title ?? "Untitled conversation"}
        renderMeta={(c) => `Updated ${timeAgo(c.updatedAt)}`}
        onLink={handleLinkChat}
        linkingId={linkingId}
      />

      <Dialog open={scriptPreview !== null} onOpenChange={(open) => !open && setScriptPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{scriptPreview?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-6 overflow-y-auto py-2">
            {scriptPreview?.options.map((option) => (
              <div key={option.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground">{option.label}</p>
                  {option.recommended ? (
                    <Badge variant="secondary" className="bg-surface-2 text-[10px] font-normal text-text-muted">
                      Recommended
                    </Badge>
                  ) : null}
                </div>
                {option.sections.map((section) => (
                  <div key={section.id}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{section.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text-muted">{section.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScriptPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
