import { useEffect } from "react";
import { brand } from "@/brand";

interface Entry {
  title: string;
  description?: string;
  overlay: boolean;
}

const entries: Entry[] = [];
const describer = () => document.querySelector('meta[name="description"]');
const defaultDescription = typeof document === "undefined" ? "" : (describer()?.getAttribute("content") ?? "");

/** The newest overlay (a sheet over a list) wins, otherwise the newest page. */
function apply() {
  const top = entries.findLast((entry) => entry.overlay) ?? entries.at(-1);
  document.title = top?.title ? `${top.title} · ${brand.name}` : brand.name;
  describer()?.setAttribute("content", top?.description ?? defaultDescription);
}

/**
 * Title and description per page (plan C3: SEO). Updates the tags index.html already has,
 * so there is never a duplicate <title> or description, and restores them on the way out.
 * A sheet opened over a page passes `overlay` so its title wins while it is open.
 */
export function usePageMeta(title: string, description?: string, { overlay = false }: { overlay?: boolean } = {}): void {
  useEffect(() => {
    const entry: Entry = { title, description, overlay };
    entries.push(entry);
    apply();
    return () => {
      entries.splice(entries.indexOf(entry), 1);
      apply();
    };
  }, [title, description, overlay]);
}
