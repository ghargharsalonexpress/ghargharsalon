import { type CartPriceResponse, pick, type PricedLine } from "@brand/shared";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, EmptyState, InlineAlert, Link, PageHeader, PriceSummary, QuantityStepper } from "@/design-system";
import { type CartLine, cartEstimatePaise, useCart } from "@/features/cart/cartStore";
import { useCartPrice } from "@/features/catalog/api";
import { durationText } from "@/lib/duration";
import { formatMoney } from "@/lib/format";
import { usePageMeta } from "./usePageMeta";

/**
 * Cart (plan W1/C9). The server prices every line; what it says wins. Changed prices and
 * unavailable services are shown, never applied silently, and checkout waits until the
 * visitor has seen them.
 */
export function CartPage() {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const lines = useCart((state) => state.lines);
  const maxQuantity = useCart((state) => state.maxQuantity);
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const sync = useCart((state) => state.sync);

  usePageMeta(t("meta.cartTitle"));

  const priced = useCartPrice({ lines: lines.map((line) => ({ serviceSlug: line.serviceSlug, tierId: line.tierId, quantity: line.quantity, seenUnitPricePaise: line.unitPricePaise })) });
  // Placeholder data from a previous cart is kept while refetching; only use it if it matches.
  const data = priced.data && priced.data.lines.length === lines.length ? priced.data : undefined;
  const byKey = new Map((data?.lines ?? []).map((line) => [line.key, line]));

  const changed = data?.lines.filter((line) => line.status === "price_changed" || line.status === "quantity_capped") ?? [];
  const unavailable = data?.lines.filter((line) => line.status === "unavailable") ?? [];
  const blocked = changed.length > 0 || unavailable.length > 0 || !data;

  if (lines.length === 0) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <Typography variant="h1">{t("cart.title")}</Typography>
        <EmptyState
          icon={<ShoppingBagOutlined />}
          title={t("cart.emptyTitle")}
          description={t("cart.emptyBody")}
          action={
            <Button to="/services" size="lg">
              {t("cart.browse")}
            </Button>
          }
        />
      </Container>
    );
  }

  const acceptChanges = (response: CartPriceResponse) =>
    sync(
      response.lines.filter((line) => line.status !== "unavailable").map(({ key, unitPricePaise, quantity, name, tierLabel }) => ({ key, unitPricePaise, quantity, name, tierLabel })),
      response.maxQuantityPerLine,
    );

  const totalMinutes = lines.reduce((sum, line) => sum + line.durationMin * line.quantity, 0);
  const checkoutButton = (
    <Button to={blocked ? undefined : "/checkout"} size="lg" disabled={blocked} fullWidth>
      {t("cart.checkout")}
    </Button>
  );

  return (
    <>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <PageHeader title={t("cart.title")} description={t("cart.duration", { duration: durationText(t, totalMinutes) })} />

        <Box sx={{ display: "grid", gap: { xs: 8, md: 12 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 360px" }, alignItems: "start" }}>
          <Box sx={{ display: "grid", gap: 4 }}>
            {changed.length > 0 && data && (
              <InlineAlert
                tone="warning"
                title={t("cart.changedTitle")}
                action={
                  <Button variant="tertiary" size="sm" onClick={() => acceptChanges(data)}>
                    {t("cart.acceptChanges")}
                  </Button>
                }
              >
                <Box component="ul" sx={{ m: 0, pl: 4 }}>
                  {changed.map((line) => (
                    <li key={line.key}>
                      {line.status === "price_changed"
                        ? t("cart.priceChanged", { name: pick(line.name, lang), price: formatMoney(line.unitPricePaise, lang) })
                        : t("cart.capped", { name: pick(line.name, lang), count: data.maxQuantityPerLine })}
                    </li>
                  ))}
                </Box>
              </InlineAlert>
            )}
            {unavailable.length > 0 && (
              <InlineAlert
                tone="warning"
                title={t("cart.unavailableTitle")}
                action={
                  <Button variant="tertiary" size="sm" onClick={() => unavailable.forEach((line) => remove(line.key))}>
                    {t("cart.removeUnavailable")}
                  </Button>
                }
              >
                {t("cart.unavailable", { names: unavailable.map((line) => pick(line.name, lang)).join(", ") })}
              </InlineAlert>
            )}
            {priced.isError && (
              <InlineAlert
                tone="danger"
                action={
                  <Button variant="tertiary" size="sm" onClick={() => void priced.refetch()}>
                    {t("common:action.retry")}
                  </Button>
                }
              >
                {t("cart.priceError")}
              </InlineAlert>
            )}

            <Box component="ul" aria-label={t("cart.itemsLabel")} sx={{ listStyle: "none", m: 0, p: 0, borderTop: `1px solid ${tokens.neutral[200]}` }}>
              {lines.map((line) => (
                <CartRow
                  key={line.key}
                  line={line}
                  priced={byKey.get(line.key)}
                  maxQuantity={maxQuantity}
                  onQuantity={(quantity) => setQuantity(line.key, quantity)}
                  onRemove={() => remove(line.key)}
                />
              ))}
            </Box>
            <Box>
              <Link to="/services">{t("cart.addMore")}</Link>
            </Box>
          </Box>

          <Box component="aside" aria-labelledby="summary-title" sx={{ position: { md: "sticky" }, top: { md: 88 }, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 5, md: 6 } }}>
            <Typography id="summary-title" variant="h2" sx={{ typography: "h3", mb: 3 }}>
              {t("cart.summary")}
            </Typography>
            <Box aria-live="polite" aria-busy={priced.isFetching}>
              <PriceSummary
                lines={(data?.lines ?? []).filter((line) => line.status !== "unavailable").map((line) => ({ id: line.key, label: pick(line.name, lang), amountPaise: line.linePaise, quantity: line.quantity }))}
                platformFeePaise={data?.platformFeePaise ?? 0}
                totalPaise={data?.totalPaise ?? cartEstimatePaise(lines)}
              />
            </Box>
            <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
              {t("cart.note")}
            </Typography>
            <Box sx={{ mt: 6, display: { xs: "none", md: "block" } }}>{checkoutButton}</Box>
            {changed.length > 0 && (
              <Typography variant="body2" sx={{ mt: 2, color: "text.secondary", display: { xs: "none", md: "block" } }}>
                {t("cart.reviewFirst")}
              </Typography>
            )}
          </Box>
        </Box>
      </Container>

      <ActionBar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" component="p" sx={{ m: 0, color: "text.secondary" }}>
            {t("common:price.total")}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatMoney(data?.totalPaise ?? cartEstimatePaise(lines), lang)}</Typography>
        </Box>
        <Box sx={{ flex: "0 0 auto" }}>
          <Button to={blocked ? undefined : "/checkout"} size="lg" disabled={blocked}>
            {t("cart.checkoutShort")}
          </Button>
        </Box>
      </ActionBar>
    </>
  );
}

function CartRow({ line, priced, maxQuantity, onQuantity, onRemove }: { line: CartLine; priced: PricedLine | undefined; maxQuantity: number; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const name = pick(priced?.name ?? line.name, lang);
  const unavailable = priced?.status === "unavailable";
  const unitPaise = priced && !unavailable ? priced.unitPricePaise : line.unitPricePaise;

  return (
    <Box component="li" sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 4, py: 5, borderBottom: `1px solid ${tokens.neutral[200]}` }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, color: unavailable ? "text.secondary" : "text.primary" }}>{name}</Typography>
        {line.tierCount > 1 && (
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            {t("cart.option", { label: pick(priced?.tierLabel ?? line.tierLabel, lang) })}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
          {unavailable ? (
            t("cart.notAvailable")
          ) : (
            <>
              {durationText(t, line.durationMin)} · {formatMoney(unitPaise, lang)}
            </>
          )}
        </Typography>
        <Box sx={{ mt: 3 }}>
          <QuantityStepper itemLabel={name} value={line.quantity} max={maxQuantity} onChange={onQuantity} onRemove={onRemove} removeLabel={t("cart.remove", { name })} />
        </Box>
      </Box>
      <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: unavailable ? "text.secondary" : "text.primary", textDecoration: unavailable ? "line-through" : "none" }}>
        {formatMoney(unitPaise * line.quantity, lang)}
      </Typography>
    </Box>
  );
}
