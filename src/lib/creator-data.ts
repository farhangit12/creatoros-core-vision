import type { LucideIcon } from "lucide-react";
import {
  Youtube,
  Instagram,
  Linkedin,
  Music2,
  AtSign,
} from "lucide-react";

export type PlatformId = "youtube" | "instagram" | "tiktok" | "linkedin" | "x";

export type Platform = {
  id: PlatformId;
  label: string;
  icon: LucideIcon;
  contentTypes: string[];
  aspectRatios: string[];
  durations: string[];
  tone: string;
  hook: string;
  cta: string;
  caption: string;
  outputFormat: string;
  recommendation: string;
};

export const platforms: Platform[] = [
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    contentTypes: ["Long-form", "Short", "Live", "Community post"],
    aspectRatios: ["16:9", "9:16"],
    durations: ["Under 60s", "3–5 min", "8–12 min", "20 min+"],
    tone: "Conversational authority",
    hook: "First 8 seconds must state the payoff",
    cta: "Subscribe + watch next",
    caption: "Chaptered description, 3–5 keywords",
    outputFormat: "1920×1080 MP4 · thumbnail 1280×720",
    recommendation: "Long-form performs best at 8–12 minutes for this audience.",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    contentTypes: ["Reel", "Carousel", "Story", "Post"],
    aspectRatios: ["9:16", "4:5", "1:1"],
    durations: ["15s", "30s", "60s", "90s"],
    tone: "Warm, visual-first",
    hook: "Motion in frame one, text hook overlaid",
    cta: "Save & share",
    caption: "2 short lines + 5 niche hashtags",
    outputFormat: "1080×1920 MP4 · cover 1080×1350",
    recommendation: "Reels under 30s hold the strongest completion rate.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: Music2,
    contentTypes: ["Short", "Series part", "Duet"],
    aspectRatios: ["9:16"],
    durations: ["15s", "30s", "60s"],
    tone: "Fast, candid, native",
    hook: "Pattern break in the first 2 seconds",
    cta: "Follow for part two",
    caption: "One line, lowercase, 3 hashtags",
    outputFormat: "1080×1920 MP4 · burned-in captions",
    recommendation: "Split into a 3-part series for repeat reach.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    contentTypes: ["Text post", "Document", "Video", "Article"],
    aspectRatios: ["1:1", "4:5", "16:9"],
    durations: ["30s", "60s", "2 min"],
    tone: "Considered, professional",
    hook: "Concrete result or contrarian claim in line one",
    cta: "Comment prompt",
    caption: "Short paragraphs, no hashtag spam",
    outputFormat: "1200×1200 · document PDF",
    recommendation: "A document carousel outperforms native video here.",
  },
  {
    id: "x",
    label: "X",
    icon: AtSign,
    contentTypes: ["Post", "Thread", "Video"],
    aspectRatios: ["16:9", "1:1"],
    durations: ["15s", "45s"],
    tone: "Sharp and compressed",
    hook: "Claim first, proof second",
    cta: "Bookmark / reply",
    caption: "Under 280 characters per beat",
    outputFormat: "1600×900 · thread of 5–7 posts",
    recommendation: "Thread the script into 6 beats with one visual.",
  },
];

export const tones = [
  "Direct & Dry",
  "Professional",
  "Conversational",
  "Friendly",
  "Bold & Energetic",
  "Storytelling",
  "Minimal",
];

export const languages = ["English (US)", "English (UK)", "Spanish", "German", "Hindi"];

export const models = [
  { id: "balanced", label: "CreatorOS Balanced", note: "~4 credits / reply" },
  { id: "precise", label: "CreatorOS Precise", note: "~9 credits / reply" },
  { id: "fast", label: "CreatorOS Fast", note: "~1 credit / reply" },
];

export const pipelineStages = [
  "Idea",
  "Draft",
  "Review",
  "Ready",
  "Scheduled",
  "Published",
] as const;

export type PipelineStage = (typeof pipelineStages)[number];
