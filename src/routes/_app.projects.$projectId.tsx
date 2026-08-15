import { useEffect, useState } from "react";
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
  Video,
  Files as FilesIcon,
  MessagesSquare,
  Plus,
  Upload,
  Sparkles,
  MoreHorizontal,
  Trash2,
  ExternalLink,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  deleteProject,
  duplicateProject,
  getProject,
  setProjectArchived,
  updateProject,
} from "@/lib/server/projects";

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

const scripts = [
  { id: "s1", title: "Episode 1 — Getting Started", status: "Draft", updated: "2 hours ago" },
  { id: "s2", title: "Episode 2 — Workflow Deep Dive", status: "In review", updated: "Yesterday" },
  { id: "s3", title: "Episode 3 — Advanced Tips", status: "Idea", updated: "4 days ago" },
];

const images = [
  { id: "i1", title: "Hero banner v3", size: "1600×900" },
  { id: "i2", title: "Social teaser tile", size: "1080×1080" },
];

const thumbnails = [
  { id: "t1", title: "Episode 1 thumbnail", variant: "A/B — Bold text" },
  { id: "t2", title: "Episode 2 thumbnail", variant: "A/B — Close-up face" },
  { id: "t3", title: "Episode 3 thumbnail", variant: "Draft" },
];

const videos = [
  { id: "v1", title: "Episode 1 — Rough cut", duration: "9:42" },
];

const files = [
  { id: "f1", name: "Brand guidelines.pdf", size: "2.4 MB" },
  { id: "f2", name: "Raw footage — cam A.mp4", size: "1.2 GB" },
  { id: "f3", name: "Voiceover script.docx", size: "48 KB" },
];

const chats = [
  { id: "c1", title: "Hook ideas for Episode 2", updated: "3 hours ago" },
  { id: "c2", title: "Thumbnail feedback thread", updated: "2 days ago" },
];

const activity = [
  { id: "a1", label: "Script draft updated", who: "You", time: "2 hours ago" },
  { id: "a2", label: "Thumbnail variant B generated", who: "You", time: "Yesterday" },
  { id: "a3", label: "Project status changed to In progress", who: "You", time: "3 days ago" },
  { id: "a4", label: "Project created", who: "You", time: "1 week ago" },
];

function ItemRow({
  title,
  meta,
  onOpen,
}: {
  title: string;
  meta: string;
  onOpen?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
        <p className="font-mono text-[11px] text-text-subtle">{meta}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 text-text-subtle hover:text-foreground">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpen}>
            <ExternalLink className="size-3.5" /> Open
          </DropdownMenuItem>
          <DropdownMenuItem>Use as reference</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem className="text-danger focus:text-danger">
            <Trash2 className="size-3.5" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setTags(project.tags.join(", "));
      setVisibility(project.visibility);
    }
  }, [project?.id]);

  function notify(action: string) {
    toast(action);
  }

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
            <Button variant="outline" size="sm" className="gap-1.5">
              <SettingsIcon className="size-3.5" /> Settings
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Assets</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">9</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Scripts</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">3</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Credits used</p>
              <p className="mt-2 text-[22px] font-medium text-foreground">640</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Description</p>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              {project.description || "No description yet."}
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Next milestone</p>
            <p className="mt-2 text-[13px] text-text-muted">Finalize Episode 2 script — due in 3 days.</p>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Quick actions</p>
            <ContextActions
              actions={[
                { label: "New script", icon: FileText, onClick: () => notify("Opening Script Studio…") },
                { label: "Generate thumbnail", icon: Clapperboard, onClick: () => notify("Opening Thumbnail Studio…") },
                { label: "Upload file", icon: Upload, onClick: () => notify("Opening Files…") },
                { label: "Open chat", icon: MessagesSquare, onClick: () => notify("Opening Chat…") },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="space-y-3 pt-6">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="size-3.5" /> New script
            </Button>
          </div>
          {scripts.map((s) => (
            <ItemRow key={s.id} title={s.title} meta={`${s.status} · updated ${s.updated}`} />
          ))}
        </TabsContent>

        <TabsContent value="images" className="pt-6">
          {images.length === 0 ? (
            <EmptyState icon={ImageIcon} title="No images yet" description="Generate or upload an image to see it here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((img) => (
                <div key={img.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="h-32 bg-surface-3" />
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{img.title}</p>
                      <p className="font-mono text-[11px] text-text-subtle">{img.size}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-text-subtle hover:text-foreground">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Open</DropdownMenuItem>
                        <DropdownMenuItem>Use as reference</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger focus:text-danger">Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="thumbnails" className="space-y-3 pt-6">
          {thumbnails.map((t) => (
            <ItemRow key={t.id} title={t.title} meta={t.variant} />
          ))}
        </TabsContent>

        <TabsContent value="videos" className="pt-6">
          {videos.length === 0 ? (
            <EmptyState icon={Video} title="No videos yet" description="Rendered or uploaded videos for this project will appear here." />
          ) : (
            <div className="space-y-3">
              {videos.map((v) => (
                <ItemRow key={v.id} title={v.title} meta={`Duration ${v.duration}`} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-3 pt-6">
          {files.map((f) => (
            <ItemRow key={f.id} title={f.name} meta={f.size} />
          ))}
        </TabsContent>

        <TabsContent value="chats" className="pt-6">
          {chats.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No chats yet" description="Start a conversation about this project from the chat surface." />
          ) : (
            <div className="space-y-3">
              {chats.map((c) => (
                <ItemRow key={c.id} title={c.title} meta={`Updated ${c.updated}`} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ol className="space-y-5 border-l border-border-subtle pl-5">
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-accent-brand" />
                <p className="text-[13px] text-foreground">{a.label}</p>
                <p className="font-mono text-[11px] text-text-subtle">{a.who} · {a.time}</p>
              </li>
            ))}
          </ol>
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
    </div>
  );
}
