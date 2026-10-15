import type { PageStatus } from "@brand/shared";
import type { BadgeTone } from "@/design-system";

export const STATUS_TONE: Record<PageStatus, BadgeTone> = { published: "success", changed: "warning", draft: "neutral" };
