import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Files as FilesIcon,
  Upload,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  Star,
  MoreHorizontal,
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  X,
  ChevronRight,
  Home,
  Download,
  Trash2,
  Move,
  Pencil,
  Sparkles,
  FolderPlus as AddToProjectIcon,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

type FileType = "folder" | "image" | "video" | "audio" | "document" | "script";

type FileItem = {
  id: string;
  name: string;
  type: FileType;
  size: string;
  modified: string;
  favourite: boolean;
};

const typeIcon: Record<FileType, typeof FileIcon> = {
  folder: Folder,
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  script: FileText,
};

const initialFiles: FileItem[] = [];

const typeFilters: { id: string; label: string; types?: FileType[] }[] = [
  { id: "all", label: "All" },
  { id: "images", label: "Images", types: ["image"] },
  { id: "video", label: "Video", types: ["video"] },
  { id: "audio", label: "Audio", types: ["audio"] },
  { id: "documents", label: "Documents", types: ["document"] },
  { id: "scripts", label: "Scripts", types: ["script"] },
];

export function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("modified");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [path] = useState(["My Files"]);

  const filtered = useMemo(() => {
    let list = files;
    const activeFilter = typeFilters.find((f) => f.id === typeFilter);
    if (activeFilter?.types) {
      list = list.filter((f) => activeFilter.types!.includes(f.type));
    }
    if (favouritesOnly) list = list.filter((f) => f.favourite);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "size") sorted.sort((a, b) => a.size.localeCompare(b.size));
    return sorted;
  }, [files, typeFilter, favouritesOnly, search, sort]);

  function toggleFavourite(id: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, favourite: !f.favourite } : f)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function deleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelected((prev) => prev.filter((s) => s !== id));
    toast("File deleted");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    toast.success("Upload started", { description: "Files are being added to this folder." });
  }

  function createFolder() {
    if (!newFolderName.trim()) {
      toast.error("Give the folder a name");
      return;
    }
    setFiles((prev) => [
      { id: `folder-${Date.now()}`, name: newFolderName.trim(), type: "folder", size: "—", modified: "Just now", favourite: false },
      ...prev,
    ]);
    setNewFolderOpen(false);
    setNewFolderName("");
    toast.success("Folder created");
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
          <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FolderPlus className="size-3.5" /> New folder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>New folder</DialogTitle>
                <DialogDescription>Create a folder in the current location.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label className="text-[12px] text-text-muted">Folder name</Label>
                <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Untitled folder" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createFolder}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="gap-1.5" onClick={() => toast.success("Upload started")}>
            <Upload className="size-3.5" /> Upload
          </Button>
        </div>
      </header>

      <nav className="flex items-center gap-1.5 text-[12px] text-text-muted">
        {path.map((p, i) => (
          <span key={p} className="flex items-center gap-1.5">
            {i === 0 ? <Home className="size-3.5" /> : null}
            <span className={cn(i === path.length - 1 && "text-foreground")}>{p}</span>
            {i < path.length - 1 ? <ChevronRight className="size-3.5 text-text-subtle" /> : null}
          </span>
        ))}
      </nav>

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
      </div>

      {uploading ? (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
          <FileIcon className="size-4 shrink-0 text-text-subtle" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-foreground">Uploading Episode 3 — cam B.mp4</p>
            <Progress value={uploadProgress} className="mt-2 h-1.5" />
          </div>
          <span className="font-mono text-[11px] text-text-subtle">{uploadProgress}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-text-subtle hover:text-foreground"
            onClick={() => {
              setUploading(false);
              toast("Upload cancelled");
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}

      {files.length > 0 ? (
        <section>
          <p className="mb-3 label-eyebrow">Recent files</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {files.slice(0, 6).map((f) => {
              const Icon = typeIcon[f.type];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPreviewFile(f)}
                  className="flex w-40 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left hover:border-accent-brand/40"
                >
                  <Icon className="size-4 text-text-muted" />
                  <p className="truncate text-[12px] text-foreground">{f.name}</p>
                  <p className="font-mono text-[10px] text-text-subtle">{f.modified}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger size="sm" className="w-40">
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
          <SelectTrigger size="sm" className="w-40">
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
            className={cn("grid size-9 place-items-center text-text-muted", view === "grid" ? "bg-surface-2 text-foreground" : "hover:text-foreground")}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast("Move files")}>
              <Move className="size-3.5" /> Move
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast("Downloading files")}>
              <Download className="size-3.5" /> Download
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast("Added to project")}>
              <AddToProjectIcon className="size-3.5" /> Add to Project
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                selected.forEach(deleteFile);
                setSelected([]);
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FilesIcon}
          title="This folder is empty"
          description="Upload files or create a folder to start organizing this workspace."
          action={
            <Button size="sm" className="gap-1.5" onClick={() => toast.success("Upload started")}>
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
              selected={selected.includes(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onToggleFavourite={() => toggleFavourite(f.id)}
              onOpen={() => setPreviewFile(f)}
              onDelete={() => deleteFile(f.id)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
          {filtered.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              selected={selected.includes(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onToggleFavourite={() => toggleFavourite(f.id)}
              onOpen={() => setPreviewFile(f)}
              onDelete={() => deleteFile(f.id)}
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
                  {previewFile.type} · {previewFile.size} · modified {previewFile.modified}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-4">
                <div className="flex h-40 items-center justify-center rounded-lg bg-surface-3">
                  {(() => {
                    const Icon = typeIcon[previewFile.type];
                    return <Icon className="size-8 text-text-subtle" />;
                  })()}
                </div>
                <dl className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <dt className="text-text-subtle">Type</dt>
                    <dd className="text-text-muted capitalize">{previewFile.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-subtle">Size</dt>
                    <dd className="text-text-muted">{previewFile.size}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-subtle">Modified</dt>
                    <dd className="text-text-muted">{previewFile.modified}</dd>
                  </div>
                </dl>
                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">AI actions</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      to="/chat"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted hover:text-foreground"
                    >
                      <Sparkles className="size-3.5" /> Ask AI about this file
                    </Link>
                    <button
                      type="button"
                      onClick={() => toast("Marked as reference")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted hover:text-foreground"
                    >
                      Use as Reference
                    </button>
                    <button
                      type="button"
                      onClick={() => toast("Added to project")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted hover:text-foreground"
                    >
                      Add to Project
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FileMenu({
  onOpen,
  onFavourite,
  favourite,
  onDelete,
}: {
  onOpen: () => void;
  onFavourite: () => void;
  favourite: boolean;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-text-subtle hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}>Preview</DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil className="size-3.5" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Move className="size-3.5" /> Move
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download className="size-3.5" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFavourite}>
          <Star className="size-3.5" /> {favourite ? "Unfavourite" : "Favourite"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/chat">
            <Sparkles className="size-3.5" /> Ask AI about this file
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Use as Reference</DropdownMenuItem>
        <DropdownMenuItem>
          <AddToProjectIcon className="size-3.5" /> Add to Project
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCard({
  file,
  selected,
  onToggleSelect,
  onToggleFavourite,
  onOpen,
  onDelete,
}: {
  file: FileItem;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleFavourite: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcon[file.type];
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
        <FileMenu onOpen={onOpen} onFavourite={onToggleFavourite} favourite={file.favourite} onDelete={onDelete} />
      </div>
      <div className="grid h-16 place-items-center rounded-lg bg-surface-3">
        <Icon className="size-6 text-text-subtle" />
      </div>
      <div>
        <p className="truncate text-[12px] text-foreground">{file.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="font-mono text-[10px] text-text-subtle">{file.size}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
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
  selected,
  onToggleSelect,
  onToggleFavourite,
  onOpen,
  onDelete,
}: {
  file: FileItem;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleFavourite: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcon[file.type];
  return (
    <div
      role="button"
      onClick={onOpen}
      className={cn("flex cursor-pointer items-center gap-4 bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-2", selected && "bg-surface-2")}
    >
      <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} onCheckedChange={onToggleSelect} />
      <Icon className="size-4 shrink-0 text-text-subtle" />
      <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">{file.name}</p>
      <span className="hidden w-20 shrink-0 font-mono text-[11px] text-text-subtle sm:block">{file.size}</span>
      <span className="hidden w-28 shrink-0 font-mono text-[11px] text-text-subtle md:block">{file.modified}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite();
        }}
        className="grid size-7 shrink-0 place-items-center text-text-muted hover:text-warning"
      >
        <Star className={cn("size-3.5", file.favourite && "fill-warning text-warning")} />
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <FileMenu onOpen={onOpen} onFavourite={onToggleFavourite} favourite={file.favourite} onDelete={onDelete} />
      </div>
    </div>
  );
}
