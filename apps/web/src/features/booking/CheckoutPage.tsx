import { useEffect, useRef, useState } from "react";
import { type AddressDto, type BookingPaymentDto, pick, type Preference, type QuoteDto } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ActionBar, Button, EmptyState, InlineAlert, Link, PageHeader, PriceSummary, RadioCards, SegmentedControl, TextField } from "@/design-system";
import { cartCount, useCart } from "@/features/cart/cartStore";
import { useCartPrice } from "@/features/catalog/api";
import { useInfo } from "@/features/public/info";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { randomKey } from "@/lib/random";
import { AddressDialog } from "./AddressDialog";
import { addressesQuery, bookingQuery, createBooking, requestQuote, retryPayment } from "./api";
import { usePaymentSheet } from "./payment";
import { addressLine, whenText } from "./text";

const MAX_ADDRESSES = 10;
/** Re-check availability silently when the quote has less than this left (plan W4). */
const QUOTE_MARGIN_MS = 15_000;

interface Pending {
  signature: string;
  booking: { id: string; number: string };
  payment: BookingPaymentDto;
}

/**
 * Checkout (plan Phase 5, W3/W4): one page, three steps in order (where, who, review and pay).
 * Availability is checked before payment and the button says exactly what will be charged.
 * The server re-prices and re-checks everything; this page only shows what it says.
 */
export function CheckoutPage() {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const { tokens } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const info = useInfo();
  const lines = useCart((state) => state.lines);
  const clearCart = useCart((state) => state.clear);
  const holdCart = useCart((state) => state.hold);
  usePageMeta(t("checkout.title"));

  const addresses = useQuery(addressesQuery);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AddressDto | "new" | null>(null);
  const [preference, setPreference] = useState<Preference>("any");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<unknown>(null);
  const [notice, setNotice] = useState<"dismissed" | "failed" | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const pending = useRef<Pending | null>(null);
  const keys = useRef(new Map<string, string>());
  const messageRef = useRef<HTMLDivElement>(null);
  const payment = usePaymentSheet();

  const saved = addresses.data ?? [];
  const address = saved.find((item) => item.id === chosenId) ?? saved.find((item) => item.isDefault) ?? saved[0] ?? null;

  // Server prices (plan C9): what the customer saw goes along, so a change is caught, never applied silently.
  const cartLines = lines.map((line) => ({ serviceSlug: line.serviceSlug, tierId: line.tierId, quantity: line.quantity, seenUnitPricePaise: line.unitPricePaise }));
  const priced = useCartPrice({ lines: cartLines });
  const prices = priced.data && priced.data.lines.length === lines.length ? priced.data : undefined;
  const cartNeedsReview = prices?.lines.some((line) => line.status !== "ok") ?? false;

  const quoteLines = lines.map(({ serviceSlug, tierId, quantity }) => ({ serviceSlug, tierId, quantity }));
  const quote = useQuery({
    queryKey: ["quote", address?.id ?? null, address?.location.lat ?? null, address?.location.lng ?? null, preference, quoteLines] as const,
    queryFn: () => (address ? requestQuote({ location: address.location, lines: quoteLines, preference }) : Promise.reject(new Error("no address"))),
    enabled: address !== null && quoteLines.length > 0,
    staleTime: 60_000,
    gcTime: 0,
    // A quote lasts two minutes; "everyone is busy" is checked again sooner.
    refetchInterval: (query) => (query.state.data?.reason === "none_free" ? 30_000 : 90_000),
  });

  useEffect(() => {
    if (payError || notice) messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [payError, notice]);

  if (paidId) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <Typography variant="h1" role="status">
          {t("checkout.paid")}
        </Typography>
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <Typography variant="h1">{t("checkout.title")}</Typography>
        <EmptyState
          icon={<ShoppingBagOutlined />}
          title={t("checkout.emptyTitle")}
          description={t("checkout.emptyBody")}
          action={
            <Button to="/services" size="lg">
              {t("checkout.browse")}
            </Button>
          }
        />
      </Container>
    );
  }

  const totalPaise = prices?.totalPaise ?? null;
  const ready = address !== null && quote.data?.available === true && prices !== undefined && !cartNeedsReview;
  const blockedReason = !address
    ? t("checkout.blocked.address")
    : cartNeedsReview
      ? t("checkout.blocked.cart")
      : quote.isPending || !prices
        ? t("checkout.blocked.checking")
        : !quote.data?.available
          ? t("checkout.blocked.unavailable")
          : null;
  const signature = JSON.stringify({ addressId: address?.id, preference, lines: cartLines, note: note.trim() });

  const pay = async () => {
    if (!ready || !address) return;
    setPayError(null);
    setNotice(null);
    setPaying(true);
    try {
      let target = pending.current?.signature === signature ? pending.current : null;
      if (target) {
        // A booking from an earlier try is still waiting for payment: pay for that one, never a second.
        try {
          target = { ...target, payment: await retryPayment(target.booking.id) };
        } catch (error) {
          if (!isApiError(error) || error.code !== "BOOKING_STATE") throw error;
          target = null;
        }
      }
      if (!target) {
        let current: QuoteDto | undefined = quote.data;
        if (!current?.expiresAt || Date.parse(current.expiresAt) - Date.now() < QUOTE_MARGIN_MS) current = (await quote.refetch()).data;
        // Not available any more: the availability panel now says why.
        if (!current?.available || !current.quoteId) return;
        const keyFor = `${signature}|${current.quoteId}`;
        const key = keys.current.get(keyFor) ?? randomKey();
        keys.current.set(keyFor, key);
        const booking = await createBooking(
          { quoteId: current.quoteId, addressId: address.id, preference, lines: cartLines, ...(note.trim() ? { note: note.trim() } : {}) },
          key,
        );
        if (!booking.payment) throw new Error("booking without a payment order");
        target = { signature, booking: { id: booking.id, number: booking.number }, payment: booking.payment };
        holdCart(booking.id);
      }
      pending.current = target;

      const outcome = await payment.pay(target.booking, target.payment);
      if (outcome.status !== "paid") {
        setNotice(outcome.status);
        return;
      }
      pending.current = null;
      queryClient.setQueryData(bookingQuery(outcome.booking.id).queryKey, outcome.booking);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setPaidId(outcome.booking.id);
      clearCart();
      navigate(`/bookings/${outcome.booking.id}`, { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === "QUOTE_EXPIRED" || error.code === "NO_PROFESSIONALS" || error.code === "OUTSIDE_AREA" || error.code === "OUTSIDE_HOURS") void quote.refetch();
        if (error.code === "PRICE_CHANGED" || error.code === "CART_UNAVAILABLE") void priced.refetch();
      }
      setPayError(error);
    } finally {
      setPaying(false);
    }
  };

  const card = { border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 5, md: 6 }, bgcolor: tokens.neutral[0] } as const;
  const amount = totalPaise === null ? "" : formatMoney(totalPaise, lang);
  const payLabel = totalPaise === null ? t("checkout.payShort") : t("checkout.pay", { amount });
  const searchMinutes = Math.round(info.searchTimeoutSeconds / 60);

  return (
    <>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <PageHeader title={t("checkout.title")} />
        <Box sx={{ display: "grid", gap: { xs: 6, md: 10 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" }, alignItems: "start" }}>
          <Box sx={{ display: "grid", gap: 6, minWidth: 0 }}>
            <Box component="section" aria-labelledby="where-title" sx={card}>
              <Typography id="where-title" variant="h3" component="h2" sx={{ mb: 4 }}>
                {t("checkout.whereTitle")}
              </Typography>
              {addresses.isPending ? (
                <Box aria-busy sx={{ display: "grid", gap: 2 }}>
                  <Skeleton variant="rounded" height={88} />
                  <Skeleton variant="rounded" height={88} />
                </Box>
              ) : addresses.isError ? (
                <InlineAlert
                  tone="danger"
                  action={
                    <Button variant="tertiary" size="sm" onClick={() => void addresses.refetch()}>
                      {t("common:action.retry")}
                    </Button>
                  }
                >
                  {t("checkout.addressesError")}
                </InlineAlert>
              ) : saved.length === 0 ? (
                <Box sx={{ display: "grid", gap: 4, justifyItems: "start" }}>
                  <Typography sx={{ color: "text.secondary" }}>{t("checkout.noAddress")}</Typography>
                  <Button variant="secondary" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
                    {t("checkout.addAddress")}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gap: 4 }}>
                  <RadioCards<string>
                    legend={t("checkout.addressesLabel")}
                    showLegend={false}
                    name="address"
                    value={address?.id ?? null}
                    onChange={setChosenId}
                    options={saved.map((item) => ({
                      value: item.id,
                      label: item.isDefault ? t("address.labelDefault", { label: t(`address.labels.${item.label}`) }) : t(`address.labels.${item.label}`),
                      description: (
                        <>
                          {addressLine(item)}
                          {item.landmark ? <Box component="span" sx={{ display: "block" }}>{t("address.near", { landmark: item.landmark })}</Box> : null}
                        </>
                      ),
                    }))}
                  />
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {address && (
                      <Button variant="tertiary" size="sm" startIcon={<EditOutlined />} onClick={() => setEditing(address)}>
                        {t("checkout.editAddress")}
                      </Button>
                    )}
                    {saved.length < MAX_ADDRESSES && (
                      <Button variant="tertiary" size="sm" startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
                        {t("checkout.addAnother")}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
              <Box sx={{ mt: 5 }}>
                <TextField
                  label={t("checkout.note")}
                  optional
                  hint={t("checkout.noteHint")}
                  multiline
                  minRows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 300))}
                  name="note"
                />
              </Box>
            </Box>

            <Box component="section" aria-labelledby="who-title" sx={card}>
              <Typography id="who-title" variant="h3" component="h2">
                {t("checkout.whoTitle")}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, mb: 4, color: "text.secondary" }}>
                {t("checkout.whoHint")}
              </Typography>
              <SegmentedControl<Preference>
                label={t("checkout.whoTitle")}
                name="preference"
                value={preference}
                onChange={setPreference}
                fullWidth
                size="lg"
                options={[
                  { value: "any", label: t("checkout.any") },
                  { value: "female", label: t("checkout.female") },
                  { value: "male", label: t("checkout.male") },
                ]}
              />
            </Box>
          </Box>

          <Box component="section" aria-labelledby="review-title" sx={{ ...card, position: { md: "sticky" }, top: { md: 88 }, minWidth: 0 }}>
            <Typography id="review-title" variant="h3" component="h2" sx={{ mb: 4 }}>
              {t("checkout.reviewTitle")}
            </Typography>
            {priced.isError ? (
              <InlineAlert
                tone="danger"
                action={
                  <Button variant="tertiary" size="sm" onClick={() => void priced.refetch()}>
                    {t("common:action.retry")}
                  </Button>
                }
              >
                {t("checkout.priceError")}
              </InlineAlert>
            ) : prices ? (
              <Box aria-live="polite">
                <PriceSummary
                  lines={prices.lines.map((line) => ({ id: line.key, label: pick(line.name, lang), amountPaise: line.linePaise, quantity: line.quantity }))}
                  platformFeePaise={prices.platformFeePaise}
                  totalPaise={prices.totalPaise}
                />
              </Box>
            ) : (
              <Box aria-busy sx={{ display: "grid", gap: 2 }}>
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </Box>
            )}
            {cartNeedsReview && (
              <Box sx={{ mt: 4 }}>
                <InlineAlert tone="warning" action={<Link to="/cart">{t("checkout.reviewCart")}</Link>}>
                  {t("checkout.cartChanged")}
                </InlineAlert>
              </Box>
            )}

            <Box sx={{ mt: 5 }}>{address ? <QuoteStatus quote={quote.data} loading={quote.isPending} failed={quote.isError} onRetry={() => void quote.refetch()} /> : null}</Box>

            <Box ref={messageRef} sx={{ mt: payError || notice ? 4 : 0 }}>
              {payError ? <InlineAlert tone="danger">{errorText(t, payError)}</InlineAlert> : null}
              {notice === "dismissed" && <InlineAlert tone="warning">{t("checkout.notCompleted")}</InlineAlert>}
              {notice === "failed" && <InlineAlert tone="danger">{t("checkout.failed")}</InlineAlert>}
            </Box>

            <Box sx={{ display: { xs: "none", md: "block" }, mt: 6 }}>
              <Button size="lg" fullWidth disabled={!ready} loading={paying} onClick={() => void pay()}>
                {payLabel}
              </Button>
              {blockedReason && (
                <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                  {blockedReason}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
              {t("checkout.refundPromise", { count: searchMinutes })}
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* The amount is on the button ("Pay ₹1,049"), so the left side says what it buys instead of repeating it. */}
      <ActionBar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="label" component="p" sx={{ m: 0 }}>
            {t("common:quantity.value", { count: cartCount(lines) })}
          </Typography>
          <Typography variant="caption" component="p" sx={{ m: 0, color: "text.secondary" }}>
            {blockedReason ?? t("common:price.taxesIncluded")}
          </Typography>
        </Box>
        <Box sx={{ flex: "0 0 auto" }}>
          <Button size="lg" disabled={!ready} loading={paying} onClick={() => void pay()}>
            {payLabel}
          </Button>
        </Box>
      </ActionBar>

      {editing !== null && (
        <AddressDialog
          address={editing === "new" ? null : editing}
          first={saved.length === 0}
          onClose={() => setEditing(null)}
          onSaved={(savedAddress) => {
            setChosenId(savedAddress.id);
            setEditing(null);
          }}
        />
      )}
      {payment.sheet}
    </>
  );
}

/** Availability before payment (plan C6): an arrival range, or why not and what to do. */
function QuoteStatus({ quote, loading, failed, onRetry }: { quote: QuoteDto | undefined; loading: boolean; failed: boolean; onRetry: () => void }) {
  const { t, i18n } = useTranslation("booking");

  let content;
  if (loading) {
    content = <InlineAlert tone="info">{t("checkout.quote.checking")}</InlineAlert>;
  } else if (failed || !quote) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Button variant="tertiary" size="sm" onClick={onRetry}>
            {t("common:action.retry")}
          </Button>
        }
      >
        {t("checkout.quote.error")}
      </InlineAlert>
    );
  } else if (quote.available && quote.etaMinutes) {
    content = (
      <InlineAlert tone="success" title={t("checkout.quote.availableTitle")}>
        {t("checkout.quote.arrives", { range: t("common:duration.range", { min: quote.etaMinutes.min, max: quote.etaMinutes.max }) })}
      </InlineAlert>
    );
  } else {
    const reason = quote.reason ?? "none_free";
    content = (
      <InlineAlert tone="warning" title={t(`checkout.quote.${reason}.title`)}>
        {reason === "outside_hours" && quote.opensAt ? t("checkout.quote.outside_hours.body", { when: whenText(t, quote.opensAt, i18n.language) }) : t(`checkout.quote.${reason}.body`)}
      </InlineAlert>
    );
  }
  return <Box aria-live="polite">{content}</Box>;
}
