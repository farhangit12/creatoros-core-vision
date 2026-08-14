import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Workflow,
  Plus,
  MoreHorizontal,
  Zap,
  Sparkles,
  Send,
  ArrowDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
} from "lucide-react";
import { SectionLabel } from "@/components/app/primitives";
import { StatusPill } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/automation")({
  head: () => ({
    meta: [
      { title: "Automation — CreatorOS AI" },
      { name: "description", content: "Chain triggers, conditions and actions into workflows that run your busywork." },
      { property: "og:title", content: "Automation — CreatorOS AI" },
      { property: "og:description", content: "Chain triggers, conditions and actions into workflows that run your busywork." },
    ],
  }),
  component: AutomationPage,
});

type Workflow = {
  id: string;
  name: string;
  trigger: string;
  lastRun: string;
  runs: number;
  enabled: boolean;
};

const initialWorkflows: Workflow[] = [
  { id: "wf-1", name: "New video → auto captions", trigger: "On upload to Projects", lastRun: "2 hours ago", runs: 128, enabled: true },
  { id: "wf-2", name: "Script → Thumbnail → Planner", trigger: "On script marked Ready", lastRun: "Yesterday", runs: 42, enabled: true },
  { id: "wf-3", name: "Weekly performance digest", trigger: "Every Monday, 9:00", lastRun: "5 days ago", runs: 11, enabled: false },
  { id: "wf-4", name: "Comment triage assistant", trigger: "On new comment", lastRun: "10 minutes ago", runs: 903, enabled: true },
];

const templates = [
  { name: "Script → Thumbnail → Planner", body: "Draft a script, generate matching thumbnails, and drop it on the calendar." },
  { name: "Repurpose long-form to Shorts", body: "Slice a long-form video into 3 short clips automatically." },
  { name: "Comment triage assistant", body: "Classify and draft replies for incoming comments." },
  { name: "Weekly performance digest", body: "Summarize the week's analytics and email a recap." },
  { name: "Idea → Outline → Draft", body: "Turn a raw idea into a structured outline, then a full draft." },
];

const historyRuns = [
  { id: "r1", time: "Today, 14:02", workflow: "Comment triage assistant", status: "Success", duration: "2.1s" },
  { id: "r2", time: "Today, 09:00", workflow: "New video → auto captions", status: "Success", duration: "48s" },
  { id: "r3", time: "Yesterday, 21:14", workflow: "Script → Thumbnail → Planner", status: "Failed", duration: "6.4s" },
  { id: "r4", time: "Yesterday, 09:00", workflow: "Weekly performance digest", status: "Skipped", duration: "—" },
  { id: "r5", time: "2 days ago, 17:30", workflow: "Comment triage assistant", status: "Success", duration: "1.8s" },
];

const statusTone: Record<string, "success" | "danger" | "neutral"> = {
  Success: "success",
  Failed: "danger",
  Skipped: "neutral",
};

const statusIcon: Record<string, typeof CheckCircle2> = {
  Success: CheckCircle2,
  Failed: XCircle,
  Skipped: MinusCircle,
};

const triggerTypes = ["On new upload", "On schedule", "On status change", "On new comment"];
const aiActions = ["Generate script draft", "Generate thumbnail", "Summarize performance", "Draft reply"];
const outputDestinations = ["Content Planner", "Projects", "Email digest", "Notification"];

function AutomationPage() {
  const [tab, setTab] = useState("workflows");
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [historyRun, setHistoryRun] = useState<(typeof historyRuns)[number] | null>(null);

  return (
    <div className="space-y-10">
      <header>
        <p className="label-eyebrow">Grow</p>
        <h1 className="mt-2 text-[30px] font-medium leading-tight tracking-[-0.03em] text-foreground">
          Automation
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          Chain triggers, conditions and actions into workflows that run your busywork.
        </p>
      </header>

      {canvasOpen ? (
        <WorkflowCanvas onClose={() => setCanvasOpen(false)} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="workflows">My workflows</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            {tab === "workflows" ? (
              <Button size="sm" onClick={() => setCanvasOpen(true)}>
                <Plus className="size-3.5" /> Create workflow
              </Button>
            ) : null}
          </div>

          <TabsContent value="workflows" className="mt-6 space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                  <Workflow className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-foreground">{wf.name}</p>
                  <p className="mt-1 text-[12px] text-text-subtle">{wf.trigger}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-[11px] text-text-muted">{wf.runs} runs</p>
                  <p className="text-[11px] text-text-subtle">Last run {wf.lastRun}</p>
                </div>
                <Switch
                  checked={wf.enabled}
                  onCheckedChange={(v) =>
                    setWorkflows((prev) =>
                      prev.map((w) => (w.id === wf.id ? { ...w, enabled: v } : w)),
                    )
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setCanvasOpen(true)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>Test run</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-danger"
                      onClick={() =>
                        setWorkflows((prev) => prev.filter((w) => w.id !== wf.id))
                      }
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="templates" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <div key={t.name} className="flex flex-col rounded-xl border border-border bg-surface p-5">
                <span className="grid size-8 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                  <Sparkles className="size-4" />
                </span>
                <p className="mt-3 text-[14px] font-medium text-foreground">{t.name}</p>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-text-muted">{t.body}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 self-start"
                  onClick={() => setCanvasOpen(true)}
                >
                  Use template
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRuns.map((r) => {
                    const Icon = statusIcon[r.status];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-text-subtle">{r.time}</TableCell>
                        <TableCell className="text-foreground">{r.workflow}</TableCell>
                        <TableCell>
                          <StatusPill tone={statusTone[r.status]}>
                            <Icon className="size-3" /> {r.status}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="font-mono text-text-muted">{r.duration}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setHistoryRun(r)}>
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Sheet open={!!historyRun} onOpenChange={(v) => !v && setHistoryRun(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Run details</SheetTitle>
          </SheetHeader>
          {historyRun ? (
            <div className="space-y-4 px-4 pb-4 text-sm">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Workflow</p>
                <p className="mt-1 text-foreground">{historyRun.workflow}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Timestamp</p>
                <p className="mt-1 text-text-muted">{historyRun.time}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Status</p>
                <StatusPill tone={statusTone[historyRun.status]} className="mt-1.5">
                  {historyRun.status}
                </StatusPill>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Duration</p>
                <p className="mt-1 font-mono text-text-muted">{historyRun.duration}</p>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type NodeKind = "trigger" | "ai" | "action" | "output";

function WorkflowCanvas({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Untitled workflow");
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState<NodeKind>("trigger");
  const [testState, setTestState] = useState<"idle" | "running" | "success">("idle");
  const [triggerType, setTriggerType] = useState(triggerTypes[0]);
  const [aiAction, setAiAction] = useState(aiActions[0]);
  const [output, setOutput] = useState(outputDestinations[0]);

  const nodes: { kind: NodeKind; label: string; icon: typeof Zap; summary: string }[] = [
    { kind: "trigger", label: "Trigger", icon: Zap, summary: triggerType },
    { kind: "ai", label: "AI Action", icon: Sparkles, summary: aiAction },
    { kind: "action", label: "Action", icon: Workflow, summary: "Apply brand kit + tags" },
    { kind: "output", label: "Output", icon: Send, summary: output },
  ];

  function runTest() {
    setTestState("running");
    setTimeout(() => setTestState("success"), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-[12px] text-text-muted">{enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runTest} disabled={testState === "running"}>
            {testState === "running" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : testState === "success" ? (
              <CheckCircle2 className="size-3.5 text-success" />
            ) : null}
            {testState === "running" ? "Running…" : testState === "success" ? "Test passed" : "Test run"}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onClose}>
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col items-center py-4">
          {nodes.map((n, i) => (
            <div key={n.kind} className="flex w-full max-w-md flex-col items-center">
              <button
                type="button"
                onClick={() => setSelected(n.kind)}
                className={
                  "flex w-full items-center gap-3 rounded-xl border bg-surface p-4 text-left transition-colors " +
                  (selected === n.kind
                    ? "border-accent-brand/60 bg-surface-2"
                    : "border-border hover:border-accent-brand/40")
                }
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                  <n.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    {n.label}
                  </span>
                  <span className="block truncate text-[13px] text-foreground">{n.summary}</span>
                </span>
              </button>
              {i < nodes.length - 1 ? (
                <div className="flex flex-col items-center py-2">
                  <div className="h-6 w-px bg-border" />
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-full border border-border bg-surface-2 text-text-subtle transition-colors hover:text-accent-brand"
                  >
                    <Plus className="size-3" />
                  </button>
                  <div className="h-6 w-px bg-border" />
                  <ArrowDown className="-mt-1 size-3 text-text-subtle" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="h-fit rounded-xl border border-border bg-surface p-5">
          <SectionLabel>Configure: {nodes.find((n) => n.kind === selected)?.label}</SectionLabel>
          {selected === "trigger" ? (
            <NodeSelect label="Trigger type" value={triggerType} onChange={setTriggerType} options={triggerTypes} />
          ) : null}
          {selected === "ai" ? (
            <NodeSelect label="AI action" value={aiAction} onChange={setAiAction} options={aiActions} />
          ) : null}
          {selected === "action" ? (
            <p className="text-[12px] leading-relaxed text-text-muted">
              Applies your Brand Kit voice and auto-tags the result before it moves downstream.
            </p>
          ) : null}
          {selected === "output" ? (
            <NodeSelect label="Output destination" value={output} onChange={setOutput} options={outputDestinations} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NodeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-text-muted">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
