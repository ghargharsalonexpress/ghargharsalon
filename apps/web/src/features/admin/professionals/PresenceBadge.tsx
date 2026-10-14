import type { PresenceDto } from "@brand/shared";
import { useTranslation } from "react-i18next";
import { Badge } from "@/design-system";

/** Online / on a job / weak connection / offline, always in words (plan B2). */
export function PresenceBadge({ presence }: { presence: PresenceDto }) {
  const { t } = useTranslation("admin");
  const tone = { available: "success", busy: "accent", stale: "warning", offline: "neutral" } as const;
  return (
    <Badge tone={tone[presence.state]} live={presence.state === "available"}>
      {t(`professionals.presence.${presence.state}`)}
    </Badge>
  );
}
