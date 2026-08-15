import type { LinkProps } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessagesSquare,
  FileText,
  Image as ImageIcon,
  Sparkles,
  FolderKanban,
  CalendarRange,
  Files,
  Gauge,
  CreditCard,
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
        label: "Image Studio",
        to: "/image-studio",
        icon: Sparkles,
        status: "live",
        description:
          "Generate and iterate on brand-consistent imagery and assets.",
      },
      {
        label: "Thumbnail Studio",
        to: "/thumbnail-studio",
        icon: ImageIcon,
        status: "live",
        description:
          "Compose click-worthy thumbnails from layout presets and prompts.",
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
        label: "Files",
        to: "/files",
        icon: Files,
        status: "live",
        description: "A workspace drive for footage, drafts, exports and assets.",
      },
      {
        label: "Content Planner",
        to: "/content-planner",
        icon: CalendarRange,
        status: "live",
        description: "Plan publishing across channels on a calendar and timeline.",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "AI usage & credits",
        to: "/ai-usage",
        icon: Gauge,
        status: "live",
        description: "Credit balance, consumption and plan details.",
      },
      {
        label: "Billing",
        to: "/billing",
        icon: CreditCard,
        status: "live",
        description: "Plan, credit allowance, payment method and invoices.",
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