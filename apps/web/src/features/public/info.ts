import { DEFAULT_SETTINGS, type PublicInfo, publicInfo } from "@brand/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";

export const infoQuery = queryOptions({
  queryKey: ["info"] as const,
  queryFn: () => api.get<PublicInfo>("/v1/info"),
  staleTime: 5 * 60_000,
});

/** Hours, fees and limits from the admin settings; the defaults stand in until they load (no layout shift). */
export function useInfo(): PublicInfo {
  return useQuery(infoQuery).data ?? publicInfo(DEFAULT_SETTINGS);
}

/** "08:00" → "8:00 am" (or "सुबह 8:00"). */
export function clockText(time: string, lang: string): string {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatTime(date, lang);
}
