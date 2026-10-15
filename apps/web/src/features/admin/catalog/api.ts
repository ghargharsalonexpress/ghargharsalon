import type { AdminServiceRow, CategoryDto, CategoryInput, ImageRef, ServiceDto, ServiceInput } from "@brand/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const adminServicesQuery = queryOptions({
  queryKey: ["admin", "services"] as const,
  queryFn: () => api.get<AdminServiceRow[]>("/v1/admin/services"),
});

export const adminServiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "service", id] as const,
    queryFn: () => api.get<ServiceDto>(`/v1/admin/services/${encodeURIComponent(id)}`),
    // An editor must never be silently refreshed under the person typing.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const adminCategoriesQuery = queryOptions({
  queryKey: ["admin", "categories"] as const,
  queryFn: () => api.get<CategoryDto[]>("/v1/admin/categories"),
});

/** Every catalogue change also refreshes what the public site shows. */
function useCatalogInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["service"] }),
    ]);
  };
}

/** Create (no id) or update with the version the editor loaded (optimistic concurrency). */
export function useSaveService() {
  const queryClient = useQueryClient();
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: ({ id, version, service }: { id: string | null; version: number; service: ServiceInput }) =>
      id ? api.put<ServiceDto>(`/v1/admin/services/${encodeURIComponent(id)}`, { version, service }) : api.post<ServiceDto>("/v1/admin/services", service),
    onSuccess: async (saved) => {
      queryClient.setQueryData(adminServiceQuery(saved.id).queryKey, saved);
      await invalidate();
    },
  });
}

export function useSaveCategory() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: ({ slug, category }: { slug: string | null; category: CategoryInput }) =>
      slug ? api.put<CategoryDto>(`/v1/admin/categories/${encodeURIComponent(slug)}`, category) : api.post<CategoryDto>("/v1/admin/categories", category),
    onSuccess: invalidate,
  });
}

export function useReorderCategories() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (slugs: string[]) => api.post<void>("/v1/admin/categories/reorder", { slugs }),
    onSuccess: invalidate,
  });
}

export type MediaFolder = "services" | "categories" | "professionals" | "site";

/** One photo → AVIF/WebP sizes on the server; returns the reference to store. */
export function useUploadImage(folder: MediaFolder) {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.upload<{ image: ImageRef }>(`/v1/admin/media?folder=${folder}`, form);
    },
  });
}
