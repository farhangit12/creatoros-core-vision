import { Polar } from "@polar-sh/sdk";
import type { PlanId } from "@/lib/credits";

/**
 * Single shared Polar SDK client instance -- lives in its own module (rather
 * than inline in auth.ts) so both auth.ts (plugin wiring) and polar-sync.ts
 * (the sync function the plugin's webhook callbacks call) can import it
 * without a circular dependency between the two.
 */
export const polarClient = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"],
  server: process.env["POLAR_SERVER"] === "production" ? "production" : "sandbox",
});

/** Polar product id -> our internal PlanId. Product IDs come from the two
 * products created in the Polar dashboard (Pro/Scale), stored as env vars
 * rather than hardcoded since sandbox and production have different IDs. */
export const POLAR_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  ...(process.env["POLAR_PRO_PRODUCT_ID"]
    ? { [process.env["POLAR_PRO_PRODUCT_ID"]]: "pro" as PlanId }
    : {}),
  ...(process.env["POLAR_SCALE_PRODUCT_ID"]
    ? { [process.env["POLAR_SCALE_PRODUCT_ID"]]: "scale" as PlanId }
    : {}),
};
