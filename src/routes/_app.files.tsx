import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Files as FilesIcon,
  Upload,
  Search,
  LayoutGrid,
  List,
  Star,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  X,
  Download,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  FolderKanban,
} from "lucide-react";
import { EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuSeparator,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  classifyMimeType,
  formatFileSize,
  toDownloadUrl,
  type FileKind,
} from "@/lib/files";
import { uploadFileToCloudinary } from "@/lib/files-upload-client";
import {
  createFileRecord,
  deleteFile,
  getUploadSignature,
  listFiles,
  renameFile,
  toggleFileFavourite,
  type FileRecord,
} from "@/lib/server/files";
import { listProjects } from "@/lib/server/projects";
import { linkFileToProject, unlinkFileFromProject } from "@/lib/server/project-content";

export const Route = createFileRoute("/_app/files")({
  head: () => ({
    meta: [
      { title: "Files — CreatorOS AI" },
      { name: "description", content: "A workspace drive for footage, drafts, exports and reference assets." },
      { property: "og:title", content: "Files — CreatorOS AI" },
      { property: "og:description", content: "A workspace drive for footage, drafts, exports and reference assets." },
    ],
  }),
  component: FilesPage,
});

const FILES_QUERY_KEY = ["files"] as const;

const typeIcon: Record<FileKind, typeof FileIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  other: FileIcon,
};

const typeFilters: { id: string; label: string; types?: FileKind[] }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images", types: ["image"] },
  { id: "video", label: "Video", types: ["video"] },
  { id: "audio", label: "Audio", types: ["audio"] },
  { id: "document", label: "Documents", types: ["document"] },
  { id: "other", label: "Other", types: ["other"] },
];

interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "error";
  error?: string;
}

export function FilesPage() {
  const queryClient = useQueryClient();
  const listFilesFn = useServerFn(listFiles);
  const getUploadSignatureFn = useServerFn(getUploadSignature);
  const createFileRecordFn = useServerFn(createFileRecord);
  const renameFileFn = useServerFn(renameFile);
  const toggleFavouriteFn = useServerFn(toggleFileFavourite);
  const deleteFileFn = useServerFn(deleteFile);

  const listProjectsFn = useServerFn(listProjects);
  const linkFileToProjectFn = useServerFn(linkFileToProject);
  const unlinkFileFromProjectFn = useServerFn(unlinkFileFromProject);

  const { data: files = [], isLoading } = useQuery({
    queryKey: FILES_QUERY_KEY,
    queryFn: () => listFilesFn(),
  });

  const { data: projectOptions = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjectsFn(),
  });
  const projectsById = useMemo(() => new Map(projectOptions.map((p) => [p.id, p.name])), [projectOptions]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("modified");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [projectLinkTarget, setProjectLinkTarget] = useState<FileRecord | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = files;
    const activeFilter = typeFilters.find((f) => f.id === typeFilter);
    if (activeFilter?.types) {
      list = list.filter((f) => activeFilter.types!.includes(f.fileType as FileKind));
    }
    if (favouritesOnly) list = list.filter((f) => f.favourite);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") sorted.sort((a, b) => b.size - a.size);
    else sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted;
  }, [files, typeFilter, favouritesOnly, search, sort]);

  const renameMutation = useMutation({
    mutationFn: (vars: { id: string; name: string }) => renameFileFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
      toast.success("File renamed");
      setRenameTarget(null);
    },
    onError: () => toast.error("Couldn't rename file. Try again."),
  });

  const favouriteMutation = useMutation({
    mutationFn: (id: string) => toggleFavouriteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY }),
    onError: () => toast.error("Couldn't update file. Try again."),
  });

  const linkProjectMutation = useMutation({
    mutationFn: (vars: { fileId: string; projectId: string | null; previousProjectId: string | null }) =>
      vars.projectId
        ? linkFileToProjectFn({ data: { fileId: vars.fileId, projectId: vars.projectId } })
        : unlinkFileFromProjectFn({ data: { fileId: vars.fileId, projectId: vars.previousProjectId! } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
      toast.success("Project updated");
      setProjectLinkTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't update the file's project.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFileFn({ data: { id } }),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
      setSelected((prev) => prev.filter((s) => s !== id));
      if (previewFile?.id === id) setPreviewFile(null);
      toast.success("File deleted");
    },
    onError: () => toast.error("Couldn't delete file. Try again."),
  });

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function uploadOne(file: File) {
    const classification = classifyMimeType(file.type);
    if (!classification) {
      toast.error(`"${file.name}" isn't a supported file type.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`"${file.name}" is larger than the ${formatFileSize(MAX_FILE_SIZE_BYTES)} limit.`);
      return;
    }

    const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;
    setUploads((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 0, status: "uploading" }]);

    try {
      const signature = await getUploadSignatureFn();
      const result = await uploadFileToCloudinary(file, signature, (percent) => {
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: percent } : u)));
      });
      await createFileRecordFn({
        data: {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url: result.url,
          storageKey: result.storageKey,
          ...(result.width ? { width: result.width } : {}),
          ...(result.height ? { height: result.height } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      toast.success(`"${file.name}" uploaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, status: "error", error: message } : u)));
      toast.error(`Couldn't upload "${file.name}"`, { description: message });
    }
  }

  function uploadFiles(fileList: FileList | File[]) {
    Array.from(fileList).forEach((file) => void uploadOne(file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-border-subtle pb-8 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="label-eyebrow">Organize</p>
          <h1 className="mt-2 text-[30px] font-medium leading-tight tracking-[-0.03em] text-foreground">Files</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
            A workspace drive for footage, drafts, exports and reference assets.
          </p>
        </div>
        <div className="mt-4 flex gap-2 sm:mt-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-3.5" /> Upload
          </Button>
        </div>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors duration-150",
          isDragging ? "border-accent-brand/60 bg-accent-tint" : "border-border bg-surface-2/40",
        )}
      >
        <Upload className={cn("mb-2 size-5", isDragging ? "text-accent-brand" : "text-text-subtle")} />
        <p className="text-[13px] text-foreground">
          {isDragging ? "Drop files to upload" : "Drag and drop files here, or use the Upload button"}
        </p>
        <p className="mt-1 font-mono text-[10px] text-text-subtle">
          Images, video, audio, PDF/docs · up to {formatFileSize(MAX_FILE_SIZE_BYTES)}
        </p>
      </div>

      {uploads.length > 0 ? (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
              {u.status === "error" ? (
                <AlertCircle className="size-4 shrink-0 text-danger" />
              ) : (
                <FileIcon className="size-4 shrink-0 text-text-subtle" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-foreground">{u.fileName}</p>
                {u.status === "error" ? (
                  <p className="mt-1 text-[11px] text-danger">{u.error}</p>
                ) : (
                  <Progress value={u.progress} className="mt-2 h-1.5" />
                )}
              </div>
              {u.status === "uploading" ? (
                <span className="font-mono text-[11px] text-text-subtle">{u.progress}%</span>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Dismiss ${u.fileName}`}
                className="size-7 text-text-subtle hover:text-foreground"
                onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeFilters.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">Last modified</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={favouritesOnly}
          className={cn("gap-1.5", favouritesOnly && "border-accent-brand/40 bg-accent-tint text-foreground")}
          onClick={() => setFavouritesOnly((v) => !v)}
        >
          <Star className={cn("size-3.5", favouritesOnly && "fill-warning text-warning")} /> Favourites
        </Button>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={cn("grid size-9 place-items-center text-text-muted", view === "grid" ? "bg-surface-2 text-foreground" : "hover:text-foreground")}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            className={cn("grid size-9 place-items-center border-l border-border text-text-muted", view === "list" ? "bg-surface-2 text-foreground" : "hover:text-foreground")}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-accent-brand/30 bg-accent-tint px-4 py-2.5">
          <span className="text-[12px] text-foreground">{selected.length} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                selected.forEach((id) => {
                  const f = files.find((x) => x.id === id);
                  if (f) window.open(toDownloadUrl(f.url), "_blank");
                });
              }}
            >
              <Download className="size-3.5" /> Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                selected.forEach((id) => deleteMutation.mutate(id));
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface-2" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FilesIcon}
          title="No files yet"
          description="Upload your first asset to get started."
          action={
            <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3.5" /> Upload files
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              projectName={f.projectId ? (projectsById.get(f.projectId) ?? null) : null}
              selected={selected.includes(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onToggleFavourite={() => favouriteMutation.mutate(f.id)}
              onOpen={() => setPreviewFile(f)}
              onRename={() => {
                setRenameTarget(f);
                setRenameValue(f.name);
              }}
              onLinkProject={() => setProjectLinkTarget(f)}
              onDelete={() => deleteMutation.mutate(f.id)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
          {filtered.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              projectName={f.projectId ? (projectsById.get(f.projectId) ?? null) : null}
              selected={selected.includes(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onToggleFavourite={() => favouriteMutation.mutate(f.id)}
              onOpen={() => setPreviewFile(f)}
              onRename={() => {
                setRenameTarget(f);
                setRenameValue(f.name);
              }}
              onLinkProject={() => setProjectLinkTarget(f)}
              onDelete={() => deleteMutation.mutate(f.id)}
            />
          ))}
        </div>
      )}

      <Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <SheetContent className="w-full max-w-md">
          {previewFile ? (
            <>
              <SheetHeader>
                <SheetTitle>{previewFile.name}</SheetTitle>
                <SheetDescription>
                  {previewFile.fileType} · {formatFileSize(previewFile.size)} · uploaded{" "}
                  {format(new Date(previewFile.createdAt), "MMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-4">
                <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-3">
                  {previewFile.fileType === "image" ? (
                    <img src={previewFile.url} alt={previewFile.name} className="max-h-64 w-full object-contain" />
                  ) : previewFile.fileType === "video" ? (
                    <video src={previewFile.url} controls className="max-h-64 w-full" />
                  ) : previewFile.fileType === "audio" ? (
                    <audio src={previewFile.url} controls className="w-full px-4" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8">
                      {(() => {
                        const Icon = typeIcon[previewFile.fileType as FileKind];
                        return <Icon className="size-8 text-text-subtle" />;
                      })()}
                      <a
                        href={previewFile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-accent-brand hover:underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
                <dl className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <dt className="text-text-subtle">Type</dt>
                    <dd className="text-text-muted">{previewFile.mimeType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-subtle">Size</dt>
                    <dd className="text-text-muted">{formatFileSize(previewFile.size)}</dd>
                  </div>
                  {previewFile.width && previewFile.height ? (
                    <div className="flex justify-between">
                      <dt className="text-text-subtle">Dimensions</dt>
                      <dd className="text-text-muted">
                        {previewFile.width} × {previewFile.height}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => window.open(toDownloadUrl(previewFile.url), "_blank")}
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      setRenameTarget(previewFile);
                      setRenameValue(previewFile.name);
                    }}
                  >
                    <Pencil className="size-3.5" /> Rename
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Choose a new name for this file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Name</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={renameMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!renameTarget) return;
                if (!renameValue.trim()) {
                  toast.error("Name can't be empty.");
                  return;
                }
                renameMutation.mutate({ id: renameTarget.id, name: renameValue.trim() });
              }}
              disabled={renameMutation.isPending}
            >
              {renameMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectLinkTarget} onOpenChange={(open) => !open && setProjectLinkTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Project</DialogTitle>
            <DialogDescription>
              {projectLinkTarget ? `Link "${projectLinkTarget.name}" to a project.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            <button
              type="button"
              disabled={linkProjectMutation.isPending}
              onClick={() =>
                projectLinkTarget &&
                linkProjectMutation.mutate({
                  fileId: projectLinkTarget.id,
                  projectId: null,
                  previousProjectId: projectLinkTarget.projectId,
                })
              }
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-surface-2",
                !projectLinkTarget?.projectId ? "text-foreground" : "text-text-muted",
              )}
            >
              No project
              {!projectLinkTarget?.projectId ? <span className="text-accent-brand">✓</span> : null}
            </button>
            {projectOptions.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-text-subtle">You don't have any projects yet.</p>
            ) : (
              projectOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={linkProjectMutation.isPending}
                  onClick={() =>
                    projectLinkTarget &&
                    linkProjectMutation.mutate({
                      fileId: projectLinkTarget.id,
                      projectId: p.id,
                      previousProjectId: projectLinkTarget.projectId,
                    })
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-surface-2",
                    projectLinkTarget?.projectId === p.id ? "text-foreground" : "text-text-muted",
                  )}
                >
                  {p.name}
                  {projectLinkTarget?.projectId === p.id ? <span className="text-accent-brand">✓</span> : null}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileMenu({
  onOpen,
  onRename,
  onFavourite,
  favourite,
  onLinkProject,
  onDelete,
}: {
  onOpen: () => void;
  onRename: () => void;
  onFavourite: () => void;
  favourite: boolean;
  onLinkProject: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="File options"
          className="size-7 text-text-subtle hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}>Preview</DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="size-3.5" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFavourite}>
          <Star className="size-3.5" /> {favourite ? "Unfavourite" : "Favourite"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLinkProject}>
          <FolderKanban className="size-3.5" /> Project
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger focus:text-danger" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCard({
  file,
  projectName,
  selected,
  onToggleSelect,
  onToggleFavourite,
  onOpen,
  onRename,
  onLinkProject,
  onDelete,
}: {
  file: FileRecord;
  projectName: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleFavourite: () => void;
  onOpen: () => void;
  onRename: () => void;
  onLinkProject: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcon[file.fileType as FileKind];
  return (
    <div
      role="button"
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-xl border bg-surface p-3 transition-colors duration-150 hover:border-accent-brand/40",
        selected ? "border-accent-brand/60 bg-surface-2" : "border-border",
      )}
    >
      <div className="flex items-start justify-between">
        <Checkbox
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={onToggleSelect}
        />
        <FileMenu
          onOpen={onOpen}
          onRename={onRename}
          onFavourite={onToggleFavourite}
          favourite={file.favourite}
          onLinkProject={onLinkProject}
          onDelete={onDelete}
        />
      </div>
      <div className="grid h-16 place-items-center overflow-hidden rounded-lg bg-surface-3">
        {file.fileType === "image" ? (
          <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <Icon className="size-6 text-text-subtle" />
        )}
      </div>
      <div>
        <p className="truncate text-[12px] text-foreground">{file.name}</p>
        {projectName ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-text-subtle">
            <FolderKanban className="size-3 shrink-0" /> {projectName}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between">
          <p className="font-mono text-[10px] text-text-subtle">{formatFileSize(file.size)}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
            aria-label={file.favourite ? `Unfavourite ${file.name}` : `Favourite ${file.name}`}
            aria-pressed={file.favourite}
            className="text-text-muted hover:text-warning"
          >
            <Star className={cn("size-3.5", file.favourite && "fill-warning text-warning")} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({
  file,
  projectName,
  selected,
  onToggleSelect,
  onToggleFavourite,
  onOpen,
  onRename,
  onLinkProject,
  onDelete,
}: {
  file: FileRecord;
  projectName: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleFavourite: () => void;
  onOpen: () => void;
  onRename: () => void;
  onLinkProject: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcon[file.fileType as FileKind];
  return (
    <div
      role="button"
      onClick={onOpen}
      className={cn("flex cursor-pointer items-center gap-4 bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-2", selected && "bg-surface-2")}
    >
      <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} onCheckedChange={onToggleSelect} />
      <Icon className="size-4 shrink-0 text-text-subtle" />
      <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">{file.name}</p>
      {projectName ? (
        <span className="hidden max-w-32 shrink-0 items-center gap-1 truncate text-[11px] text-text-subtle lg:flex">
          <FolderKanban className="size-3 shrink-0" /> {projectName}
        </span>
      ) : null}
      <span className="hidden w-20 shrink-0 font-mono text-[11px] text-text-subtle sm:block">{formatFileSize(file.size)}</span>
      <span className="hidden w-28 shrink-0 font-mono text-[11px] text-text-subtle md:block">
        {format(new Date(file.updatedAt), "MMM d, yyyy")}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite();
        }}
        aria-label={file.favourite ? `Unfavourite ${file.name}` : `Favourite ${file.name}`}
        aria-pressed={file.favourite}
        className="grid size-7 shrink-0 place-items-center text-text-muted hover:text-warning"
      >
        <Star className={cn("size-3.5", file.favourite && "fill-warning text-warning")} />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <FileMenu
          onOpen={onOpen}
          onRename={onRename}
          onFavourite={onToggleFavourite}
          favourite={file.favourite}
          onLinkProject={onLinkProject}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
