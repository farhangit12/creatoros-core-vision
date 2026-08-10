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
  Repeat2,
  BookOpen,
  Palette,
  Brain,
  CreditCard,
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
        status: "live",
        description:
          "A conversational workspace for ideation, rewriting and research.",
      },
      {
        label: "Script Studio",
        to: "/script-studio",
        icon: FileText,
        status: "live",
        description:
          "Draft, structure and refine long-form scripts with AI assistance.",
      },
      {
        label: "Thumbnail Studio",
        to: "/thumbnail-studio",
        icon: ImageIcon,
        status: "live",
        description:
          "Compose click-worthy thumbnails from layout presets and prompts.",
      },
      {
        label: "Video Studio",
        to: "/video-studio",
        icon: Clapperboard,
        status: "live",
        description:
          "Assemble short-form cuts, captions and renders in one timeline.",
      },
      {
        label: "Image Studio",
        to: "/image-studio",
        icon: Sparkles,
        status: "live",
        description:
          "Generate and iterate on brand-consistent imagery and assets.",
      },
      {
        label: "Repurpose",
        to: "/repurpose",
        icon: Repeat2,
        status: "live",
        description:
          "Adapt one piece of content into platform-native versions.",
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
        status: "live",
        description:
          "Every deliverable, client and campaign in one operating surface.",
      },
      {
        label: "Content Planner",
        to: "/content-planner",
        icon: CalendarRange,
        status: "live",
        description: "Plan publishing across channels on a calendar and timeline.",
      },
      {
        label: "Files",
        to: "/files",
        icon: Files,
        status: "live",
        description: "A workspace drive for footage, drafts, exports and assets.",
      },
      {
        label: "Templates",
        to: "/templates",
        icon: LayoutTemplate,
        status: "live",
        description: "Reusable starting points for scripts, posts and visuals.",
      },
      {
        label: "Knowledge Base",
        to: "/knowledge-base",
        icon: BookOpen,
        status: "live",
        description: "Documents, notes and research the AI can draw on.",
      },
      {
        label: "Brand Kit",
        to: "/brand-kit",
        icon: Palette,
        status: "live",
        description: "Logo, colours, fonts and voice that define your brand.",
      },
      {
        label: "AI Memory",
        to: "/ai-memory",
        icon: Brain,
        status: "live",
        description: "What the AI should remember about you and your audience.",
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
        status: "live",
        description: "Chain triggers, conditions and actions into workflows.",
      },
      {
        label: "Analytics",
        to: "/analytics",
        icon: BarChart3,
        status: "live",
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
      {
        label: "Billing",
        to: "/billing",
        icon: CreditCard,
        status: "live",
        description: "Plan, credit allowance, payment method and invoices.",
      },
    ],
  },
];

export const allNavItems: NavItem[] = navigation.flatMap((g) => g.items);

export function findNavItem(pathname: string) {
  return allNavItems.find((i) => i.to === pathname);
}