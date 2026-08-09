import type { LinkProps } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessagesSquare,
  FileText,
  Image as ImageIcon,
  Clapperboard,
  Sparkles,
  FolderKanban,
  CalendarRange,
  Files,
  LayoutTemplate,
  Workflow,
  BarChart3,
  Gauge,
  Bell,
  CalendarClock,
  UserRound,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: LinkProps["to"] & string;
  icon: LucideIcon;
  status: "live" | "later";
  badge?: string;
  description: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        status: "live",
        description: "Your creative workspace home.",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "AI Chat",
        to: "/chat",
        icon: MessagesSquare,
        status: "later",
        description:
          "A conversational workspace for ideation, rewriting and research.",
      },
      {
        label: "Script Studio",
        to: "/script-studio",
        icon: FileText,
        status: "later",
        description:
          "Draft, structure and refine long-form scripts with AI assistance.",
      },
      {
        label: "Thumbnail Studio",
        to: "/thumbnail-studio",
        icon: ImageIcon,
        status: "later",
        description:
          "Compose click-worthy thumbnails from layout presets and prompts.",
      },
      {
        label: "Video Studio",
        to: "/video-studio",
        icon: Clapperboard,
        status: "later",
        description:
          "Assemble short-form cuts, captions and renders in one timeline.",
      },
      {
        label: "Image Studio",
        to: "/image-studio",
        icon: Sparkles,
        status: "later",
        description:
          "Generate and iterate on brand-consistent imagery and assets.",
      },
    ],
  },
  {
    label: "Organize",
    items: [
      {
        label: "Projects",
        to: "/projects",
        icon: FolderKanban,
        status: "later",
        description:
          "Every deliverable, client and campaign in one operating surface.",
      },
      {
        label: "Content Planner",
        to: "/content-planner",
        icon: CalendarRange,
        status: "later",
        description: "Plan publishing across channels on a calendar and timeline.",
      },
      {
        label: "Files",
        to: "/files",
        icon: Files,
        status: "later",
        description: "A workspace drive for footage, drafts, exports and assets.",
      },
      {
        label: "Templates",
        to: "/templates",
        icon: LayoutTemplate,
        status: "later",
        description: "Reusable starting points for scripts, posts and visuals.",
      },
    ],
  },
  {
    label: "Grow",
    items: [
      {
        label: "Automation",
        to: "/automation",
        icon: Workflow,
        status: "later",
        description: "Chain triggers, conditions and actions into workflows.",
      },
      {
        label: "Analytics",
        to: "/analytics",
        icon: BarChart3,
        status: "later",
        description: "Performance, trends and reporting across your channels.",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "AI Usage & Credits",
        to: "/ai-usage",
        icon: Gauge,
        status: "live",
        description: "Credit balance, consumption and plan details.",
      },
      {
        label: "Notifications",
        to: "/notifications",
        icon: Bell,
        status: "live",
        badge: "3",
        description: "Everything that happened while you were creating.",
      },
      {
        label: "Upcoming",
        to: "/upcoming",
        icon: CalendarClock,
        status: "live",
        description: "Scheduled and planned items across your workspace.",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Profile",
        to: "/profile",
        icon: UserRound,
        status: "live",
        description: "Your identity across CreatorOS.",
      },
      {
        label: "Settings",
        to: "/settings",
        icon: Settings,
        status: "live",
        description: "Workspace preferences and security.",
      },
    ],
  },
];

export const allNavItems: NavItem[] = navigation.flatMap((g) => g.items);

export function findNavItem(pathname: string) {
  return allNavItems.find((i) => i.to === pathname);
}