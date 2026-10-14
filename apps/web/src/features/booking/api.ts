import type {
  AddressData,
  AddressDto,
  BookingDto,
  BookingPaymentDto,
  BookingSummaryDto,
  CancelPreviewDto,
  CreateBookingInput,
  InvoiceDto,
  QuoteDto,
  QuoteRequest,
} from "@brand/shared";
import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keepNewestTracking } from "./tracking";

// ---------- addresses ----------

export const addressesQuery = queryOptions({
  queryKey: ["addresses"] as const,
  queryFn: () => api.get<AddressDto[]>("/v1/me/addresses"),
});

export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, address }: { id: string | null; address: AddressData }) =>
      id ? api.put<AddressDto>(`/v1/me/addresses/${id}`, address) : api.post<AddressDto>("/v1/me/addresses", address),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/me/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });
}

// ---------- checkout ----------

export const requestQuote = (input: QuoteRequest) => api.post<QuoteDto>("/v1/availability/quote", input);

/** The key makes a double tap create one booking (plan C12). */
export const createBooking = (input: CreateBookingInput, idempotencyKey: string) => api.post<BookingDto>("/v1/bookings", input, { "Idempotency-Key": idempotencyKey });

export const verifyPayment = (bookingId: string, input: { orderId: string; paymentId: string; signature: string }) => api.post<BookingDto>(`/v1/bookings/${bookingId}/payments/verify`, input);
export const retryPayment = (bookingId: string) => api.post<BookingPaymentDto>(`/v1/bookings/${bookingId}/payments/retry`);
/** Development only: the local gateway's test payment. */
export const localPay = (orderId: string, outcome: "success" | "failure") => api.post<{ paymentId: string; signature: string }>("/v1/payments/local/pay", { orderId, outcome });

// ---------- bookings ----------

const ACTIVE = new Set(["awaiting_payment", "searching", "accepted", "arrived", "in_progress"]);

export const bookingQuery = (id: string) =>
  queryOptions({
    queryKey: ["booking", id] as const,
    queryFn: () => api.get<BookingDto>(`/v1/bookings/${id}`),
    // Real-time events trigger refetches; polling is the safety net while the booking is live.
    refetchInterval: (query) => (query.state.data && ACTIVE.has(query.state.data.status) ? 15_000 : false),
    structuralSharing: keepNewestTracking,
  });

export const myBookingsQuery = infiniteQueryOptions({
  queryKey: ["bookings", "mine"] as const,
  queryFn: ({ pageParam }) => api.get<BookingSummaryDto[]>(`/v1/bookings${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`),
  initialPageParam: "",
  getNextPageParam: (last) => (last.length === 20 ? (last.at(-1)?.createdAt ?? undefined) : undefined),
});

export const cancelPreviewQuery = (id: string) =>
  queryOptions({
    queryKey: ["booking", id, "cancel-preview"] as const,
    queryFn: () => api.get<CancelPreviewDto>(`/v1/bookings/${id}/cancel-preview`),
    staleTime: 0,
  });

export function useCancelBooking(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.post<BookingDto>(`/v1/bookings/${id}/cancel`, { reason }),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingQuery(id).queryKey, booking);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment: string }) => api.post<void>(`/v1/bookings/${id}/review`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingQuery(id).queryKey }),
  });
}

export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["booking", id, "invoice"] as const,
    queryFn: () => api.get<InvoiceDto>(`/v1/bookings/${id}/invoice`),
    staleTime: Infinity,
  });
