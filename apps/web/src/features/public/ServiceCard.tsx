import { useRef } from "react";
import { cartLineKey, pick, type ServiceSummaryDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Button, Picture, QuantityStepper, VisuallyHidden } from "@/design-system";
import { useCart } from "@/features/cart/cartStore";
import { catalogQuery } from "@/features/catalog/api";
import { defaultPhotoFor, servicePhoto } from "@/features/catalog/photos";
import { durationText } from "@/lib/duration";
import { formatMoney } from "@/lib/format";
import { SHEET_STATE } from "./sheet";

export interface ServiceCardProps {
  service: ServiceSummaryDto;
  /** The details sheet for this service, keeping the listing's filters in the URL. */
  detailsTo: string;
  headingLevel?: "h2" | "h3";
}

/** Only worth showing when the saving is real; a 1% badge is noise. */
function discountPercent(service: ServiceSummaryDto): number | null {
  if (!service.compareAtPaise || service.compareAtPaise <= service.fromPricePaise) return null;
  const percent = Math.round((1 - service.fromPricePaise / service.compareAtPaise) * 100);
  return percent >= 5 ? percent : null;
}

/**
 * A service as a card (W1): photo, name, price and two actions, in a grid.
 * The name is the link to the details sheet and stretches over the card; the footer
 * buttons sit above that link, so the two never nest.
 */
export function ServiceCard({ service, detailsTo, headingLevel = "h3" }: ServiceCardProps) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const n = tokens.neutral;
  const name = pick(service.name, lang);
  const summary = pick(service.summary, lang);
  const single = service.tiers.length === 1 ? service.tiers[0] : undefined;
  const singleKey = single ? cartLineKey(service.slug, single.id) : "";
  const line = useCart((state) => state.lines.find((item) => item.key === singleKey));
  const inCart = useCart((state) => state.lines.filter((item) => item.serviceSlug === service.slug).reduce((sum, item) => sum + item.quantity, 0));
  const maxQuantity = useCart((state) => state.maxQuantity);
  const add = useCart((state) => state.add);
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  // No empty tiles: a service without its own photo shows its category's.
  const categories = useQuery(catalogQuery).data?.categories;

  // The Add button and the stepper replace each other; keep keyboard focus on whichever appears.
  const focusNext = useRef(false);
  const focusFirstButton = (node: HTMLElement | null) => {
    if (node && focusNext.current) {
      focusNext.current = false;
      node.querySelector("button")?.focus();
    }
  };

  const prices = service.tiers.map((tier) => tier.pricePaise);
  const variesInPrice = Math.min(...prices) !== Math.max(...prices);
  const price = formatMoney(service.fromPricePaise, lang);
  const compareAt = service.compareAtPaise ? formatMoney(service.compareAtPaise, lang) : null;
  const percent = discountPercent(service);

  const action = single ? (
    line ? (
      <Box ref={focusFirstButton} sx={{ flex: 1 }}>
        <QuantityStepper
          itemLabel={name}
          value={line.quantity}
          max={maxQuantity}
          onChange={(quantity) => setQuantity(line.key, quantity)}
          onRemove={() => {
            focusNext.current = true;
            remove(line.key);
          }}
          removeLabel={t("services.remove")}
        />
      </Box>
    ) : (
      <Box ref={focusFirstButton} sx={{ flex: 1 }}>
        <Button
          fullWidth
          aria-label={t("services.addNamed", { name })}
          onClick={() => {
            focusNext.current = true;
            add({
              serviceSlug: service.slug,
              tierId: single.id,
              unitPricePaise: single.pricePaise,
              name: service.name,
              tierLabel: single.label,
              tierCount: 1,
              durationMin: single.durationMin,
            });
          }}
        >
          {t("services.add")}
        </Button>
      </Box>
    )
  ) : (
    <Button fullWidth to={detailsTo} preventScrollReset state={SHEET_STATE} aria-label={t("services.chooseNamed", { name })} sx={{ flex: 1 }}>
      {t("services.choose")}
    </Button>
  );

  const Heading = headingLevel;

  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: `1px solid ${n[200]}`,
        borderRadius: `${tokens.radius.md}px`,
        overflow: "hidden",
        backgroundColor: n[0],
        transition: "box-shadow 160ms ease, transform 160ms ease",
        "@media (hover: hover)": {
          "&:hover": { boxShadow: tokens.elevation.e2, transform: "translateY(-2px)" },
        },
        "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
      }}
    >
      <Picture image={servicePhoto(service, categories)} fallback={defaultPhotoFor(service.categorySlugs)} alt="" sizes="(min-width: 900px) 360px, (min-width: 600px) 50vw, 100vw" ratio="4 / 3" sx={{ borderRadius: 0 }} />

      <Box sx={{ p: 4, display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Typography variant="h3" component={Heading} sx={{ m: 0 }}>
          <Box
            component={RouterLink}
            to={detailsTo}
            preventScrollReset
            state={SHEET_STATE}
            sx={{
              color: "inherit",
              textDecoration: "none",
              outline: "none",
              "&:hover": { textDecoration: "underline", textUnderlineOffset: "0.2em" },
              // The link covers the card, so clicking anywhere but the footer opens the details.
              "&::after": { content: '""', position: "absolute", inset: 0, borderRadius: `${tokens.radius.md}px` },
              "&:focus-visible::after": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
            }}
          >
            {name}
          </Box>
        </Typography>

        {summary && (
          <Typography variant="body2" component="p" sx={{ mt: 1.5, color: "text.secondary" }}>
            {summary}
          </Typography>
        )}

        <Typography component="p" sx={{ mt: 3, display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 2 }}>
          <Box component="span" sx={{ fontWeight: 700, color: tokens.accent[700], fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {variesInPrice ? t("services.from", { price }) : price}
          </Box>
          {compareAt && (
            <>
              <Box component="s" aria-hidden sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                {compareAt}
              </Box>
              <VisuallyHidden>{t("detail.was", { price: compareAt })}</VisuallyHidden>
            </>
          )}
          {percent !== null && (
            <Box component="span" sx={{ fontWeight: 600, fontSize: "0.875rem", color: tokens.semantic.success.fg, whiteSpace: "nowrap" }}>
              {t("services.off", { percent })}
            </Box>
          )}
        </Typography>

        <Typography variant="body2" component="p" sx={{ mt: 1, color: "text.secondary" }}>
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>
            {durationText(t, service.durationMin)}
          </Box>
          {service.tierCount > 1 && (
            <>
              {" · "}
              <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                {t("services.options", { count: service.tierCount })}
              </Box>
            </>
          )}
          {!single && inCart > 0 && (
            <>
              {" · "}
              <Box component="span" sx={{ whiteSpace: "nowrap", color: tokens.accent[700], fontWeight: 500 }}>
                {t("services.inCart", { count: inCart })}
              </Box>
            </>
          )}
        </Typography>
      </Box>

      {/* Above the stretched link, so these are the only clickable things inside the card. */}
      <Box sx={{ position: "relative", zIndex: 1, mt: "auto", p: 3, borderTop: `1px solid ${n[200]}`, display: "flex", gap: 2 }}>
        <Button variant="secondary" to={detailsTo} preventScrollReset state={SHEET_STATE} aria-label={t("services.viewDetailsNamed", { name })} sx={{ flex: 1 }}>
          {t("services.viewDetails")}
        </Button>
        {action}
      </Box>
    </Box>
  );
}
