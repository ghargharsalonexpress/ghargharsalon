import { useRef } from "react";
import { cartLineKey, pick, type ServiceSummaryDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Button, Picture, QuantityStepper, VisuallyHidden } from "@/design-system";
import { useCart } from "@/features/cart/cartStore";
import { durationText } from "@/lib/duration";
import { formatMoney } from "@/lib/format";
import { SHEET_STATE } from "./sheet";

export interface ServiceRowProps {
  service: ServiceSummaryDto;
  /** The details sheet for this service, keeping the listing's filters in the URL. */
  detailsTo: string;
  headingLevel?: "h2" | "h3";
}

/**
 * A service in a list (W1): text first, so it reads well with or without a photo.
 * The name is the link to the details sheet and stretches over the whole row; the
 * Add button sits above that link, so the two never nest.
 */
export function ServiceRow({ service, detailsTo, headingLevel = "h3" }: ServiceRowProps) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
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

  const action = single ? (
    line ? (
      <Box ref={focusFirstButton}>
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
      <Box ref={focusFirstButton}>
        <Button
          variant="secondary"
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
          sx={{ minWidth: 96 }}
        >
          {t("services.add")}
        </Button>
      </Box>
    )
  ) : (
    <Button variant="secondary" to={detailsTo} preventScrollReset state={SHEET_STATE} aria-label={t("services.chooseNamed", { name })} sx={{ minWidth: 96 }}>
      {t("services.choose")}
    </Button>
  );

  const Heading = headingLevel;

  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 4,
        py: 5,
        borderBottom: `1px solid ${tokens.neutral[200]}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
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
              // The link covers the row, so the whole row opens the details.
              "&::after": { content: '""', position: "absolute", inset: 0, borderRadius: `${tokens.radius.sm}px` },
              "&:focus-visible::after": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
            }}
          >
            {name}
          </Box>
        </Typography>

        <Typography sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 2 }}>
          <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
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

        {summary && (
          <Typography variant="body2" component="p" sx={{ mt: 2, color: "text.secondary", maxWidth: "60ch" }}>
            {summary}
          </Typography>
        )}
      </Box>

      {/* The photo stays under the stretched link (it opens the details); only the action sits above it. */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: { xs: 104, sm: 120 } }}>
        {service.image && <Picture image={service.image} alt="" sizes={120} ratio="1 / 1" />}
        <Box sx={{ position: "relative", zIndex: 1 }}>{action}</Box>
      </Box>
    </Box>
  );
}
