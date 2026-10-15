import {
  type AreaRequestInput,
  DEFAULT_SITE_CONFIG,
  type LocateResponse,
  type PublicPageDto,
  type PublicReviewDto,
  type PublicSiteDto,
} from "@brand/shared";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/app/queryClient";
import { applySiteBrand } from "@/brand";
import { setMetaDefaults } from "@/features/public/usePageMeta";
import { api } from "@/lib/api";
import { imageSrc } from "@/lib/media";

/** What the site looks like before /v1/site answers (and if it can't): the shipped defaults. */
export const FALLBACK_SITE: PublicSiteDto = { version: 0, site: DEFAULT_SITE_CONFIG, areas: [] };

/** Brand, theme, menus and footer (ADR-0021). The API sends an ETag, so a revisit is a tiny 304. */
export const siteQuery = queryOptions({
  queryKey: ["site"] as const,
  queryFn: async () => {
    const site = await api.get<PublicSiteDto>("/v1/site");
    // Plain code (error texts, the payment sheet, page titles) reads the brand from here.
    applySiteBrand(site.site);
    const image = site.site.seo.image;
    setMetaDefaults({
      siteName: site.site.brand.name.en,
      template: site.site.seo.titleTemplate,
      image: image ? new URL(imageSrc(image, 1200), window.location.origin).toString() : "",
    });
    return site;
  },
  staleTime: 5 * 60_000,
});

export function useSite(): PublicSiteDto {
  return useQuery(siteQuery).data ?? FALLBACK_SITE;
}

/**
 * A page by its path; `preview` asks for the draft (admins only, the API ignores it otherwise).
 * If the API has no website at all (an older API during a deploy, or one that is down), the
 * pages the site ships with still show. When the API does answer /v1/site, its 404 stands:
 * that is a page an admin deleted, and it must stay gone.
 */
export const pageQuery = (path: string, preview = false) =>
  queryOptions({
    queryKey: ["page", path, preview] as const,
    queryFn: async () => {
      try {
        return await api.get<PublicPageDto>(`/v1/pages?path=${encodeURIComponent(path)}${preview ? "&preview=1" : ""}`);
      } catch (error) {
        const apiHasWebsite = await queryClient.fetchQuery(siteQuery).then(
          () => true,
          () => false,
        );
        if (!preview && !apiHasWebsite) {
          const shipped = (await import("./shippedPages")).shippedPage(path);
          if (shipped) return shipped;
        }
        throw error;
      }
    },
    staleTime: preview ? 0 : 5 * 60_000,
    retry: (count, error) => count < 2 && !(error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404),
  });

export const reviewsQuery = queryOptions({
  queryKey: ["site", "reviews"] as const,
  queryFn: () => api.get<PublicReviewDto[]>("/v1/site/reviews"),
  staleTime: 10 * 60_000,
});

export const locate = (point: { lat: number; lng: number }) => api.post<LocateResponse>("/v1/locate", point);

export function useAreaRequest() {
  return useMutation({ mutationFn: (input: AreaRequestInput) => api.post<void>("/v1/site/area-requests", input) });
}
