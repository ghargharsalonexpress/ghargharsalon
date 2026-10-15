import { useEffect } from "react";
import { brand } from "@/brand";

export interface PageMetaOptions {
  /** A sheet over a page: its title wins while it is open. */
  overlay?: boolean;
  /** Absolute URL of the photo link previews show. */
  image?: string;
  /** Keep this page out of search results. */
  noindex?: boolean;
  /** schema.org data for search engines (one or more objects). */
  jsonLd?: ReadonlyArray<Record<string, unknown>>;
}

interface Entry extends PageMetaOptions {
  title: string;
  description?: string;
}

/** Site-wide values from Admin → Website (ADR-0021); setMetaDefaults fills them once /v1/site loads. */
const defaults = { template: "", siteName: "", image: "" };
const entries: Entry[] = [];
const describer = () => document.querySelector('meta[name="description"]');
const defaultDescription = typeof document === "undefined" ? "" : (describer()?.getAttribute("content") ?? "");

export function setMetaDefaults(values: Partial<typeof defaults>): void {
  Object.assign(defaults, values);
  if (typeof document !== "undefined" && entries.length > 0) apply();
}

/** Creates or updates <meta>/<link> tags this hook owns; `null` removes it. */
function tag(selector: string, create: () => HTMLElement, attribute: string, value: string | null) {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (value === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = create();
    element.dataset.pageMeta = "";
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

const meta = (key: "name" | "property", name: string, value: string | null) =>
  tag(
    `meta[${key}="${name}"]`,
    () => {
      const element = document.createElement("meta");
      element.setAttribute(key, name);
      return element;
    },
    "content",
    value,
  );

/** The newest overlay (a sheet over a list) wins, otherwise the newest page. */
function apply() {
  const top = entries.findLast((entry) => entry.overlay) ?? entries.at(-1);
  const siteName = defaults.siteName || brand.name;
  const template = defaults.template || `%s · ${siteName}`;
  const title = top?.title ? template.replace("%s", top.title) : siteName;
  const description = top?.description ?? defaultDescription;
  const url = `${window.location.origin}${window.location.pathname}`;
  const image = top?.image || defaults.image;

  document.title = title;
  describer()?.setAttribute("content", description);
  tag(
    'link[rel="canonical"]',
    () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    },
    "href",
    url,
  );
  meta("name", "robots", top?.noindex ? "noindex" : null);
  meta("property", "og:type", "website");
  meta("property", "og:site_name", siteName);
  meta("property", "og:title", title);
  meta("property", "og:description", description);
  meta("property", "og:url", url);
  meta("property", "og:image", image || null);
  meta("name", "twitter:card", image ? "summary_large_image" : "summary");

  document.getElementById("page-jsonld")?.remove();
  const data = entries.flatMap((entry) => entry.jsonLd ?? []);
  if (data.length > 0) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "page-jsonld";
    script.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
    document.head.append(script);
  }
}

/**
 * Title, description, canonical address, link-preview tags and schema.org data per page
 * (plan C3: SEO). Updates the tags index.html already has, so there is never a duplicate,
 * and restores them on the way out.
 */
export function usePageMeta(title: string, description?: string, options: PageMetaOptions = {}): void {
  const { overlay = false, image, noindex = false, jsonLd } = options;
  const data = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const entry: Entry = { title, description, overlay, image, noindex, jsonLd: data ? (JSON.parse(data) as Entry["jsonLd"]) : undefined };
    entries.push(entry);
    apply();
    return () => {
      entries.splice(entries.indexOf(entry), 1);
      apply();
    };
  }, [title, description, overlay, image, noindex, data]);
}
