import type { CartPriceInput, CartPriceResponse, CatalogResponse, ServiceDto } from "@brand/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** The whole public catalogue in one cached request (the API sends an ETag). */
export const catalogQuery = queryOptions({
  queryKey: ["catalog"] as const,
  queryFn: () => api.get<CatalogResponse>("/v1/catalog"),
  staleTime: 5 * 60_000,
});

export const serviceQuery = (slug: string) =>
  queryOptions({
    queryKey: ["service", slug] as const,
    queryFn: () => api.get<ServiceDto>(`/v1/services/${encodeURIComponent(slug)}`),
    staleTime: 5 * 60_000,
  });

export const useCatalog = () => useQuery(catalogQuery);

/** Server prices for the current cart (plan C9); refetched whenever the lines change. */
export function useCartPrice(input: CartPriceInput, enabled = true) {
  return useQuery({
    queryKey: ["cart-price", input] as const,
    queryFn: () => api.post<CartPriceResponse>("/v1/cart/price", input),
    enabled: enabled && input.lines.length > 0,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}
