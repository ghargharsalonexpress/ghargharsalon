import { type ReactNode, useRef, useState } from "react";
import { cartLineKey, type Localized, pick, type ServiceDto, type Tier } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { Button, FaqList, InlineAlert, Picture, QuantityStepper, RadioCards, ResponsiveDialog, VisuallyHidden } from "@/design-system";
import { useCart } from "@/features/cart/cartStore";
import { serviceQuery, useCatalog } from "@/features/catalog/api";
import { isApiError } from "@/lib/api";
import { durationText } from "@/lib/duration";
import { formatMoney } from "@/lib/format";
import { useInfo } from "./info";
import type { SHEET_STATE } from "./sheet";
import { usePageMeta } from "./usePageMeta";

/**
 * Service details (plan A7: /services/:slug, a deep-linkable sheet over the list). Opens
 * instantly with what the list already knows, then fills in the full sections.
 */
export function ServiceSheet() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { search, state } = useLocation();
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const catalog = useCatalog();
  const summary = catalog.data?.services.find((service) => service.slug === slug);
  const details = useQuery(serviceQuery(slug));
  const [chosenTier, setChosenTier] = useState<string | null>(null);
  const info = useInfo();

  // Opened from the list: Back returns to it exactly. Opened from a shared link: show the list.
  const close = () => {
    if ((state as typeof SHEET_STATE | null)?.fromList) void navigate(-1);
    else void navigate({ pathname: "/services", search }, { replace: true, preventScrollReset: true });
  };

  const service = details.data;
  const notFound = isApiError(details.error) && details.error.code === "NOT_FOUND";
  const name = service ? pick(service.name, lang) : summary ? pick(summary.name, lang) : "";
  const description = service ? pick(service.summary, lang) : summary ? pick(summary.summary, lang) : "";
  const tiers = service?.tiers ?? summary?.tiers ?? [];
  const tier = tiers.find((item) => item.id === chosenTier) ?? tiers[0];
  const image = service?.images[0] ?? summary?.image ?? null;

  usePageMeta(notFound ? t("detail.notFoundTitle") : name, description || undefined, { overlay: true });

  if (notFound) {
    return (
      <ResponsiveDialog
        open
        onClose={close}
        title={t("detail.notFoundTitle")}
        description={t("detail.notFoundBody")}
        actions={<Button onClick={close}>{t("detail.backToServices")}</Button>}
      />
    );
  }

  return (
    <ResponsiveDialog
      open
      onClose={close}
      maxWidth="sm"
      stickyActions
      title={name || t("detail.loading")}
      description={description || undefined}
      actions={tier ? <SheetActions slug={slug} name={service?.name ?? summary?.name} tier={tier} tierCount={tiers.length} /> : undefined}
    >
      <Box sx={{ display: "grid", gap: 6 }}>
        {image && <Picture image={image} alt={name} sizes="(min-width: 600px) 552px, 100vw" ratio="3 / 2" priority />}

        {tier && tiers.length === 1 && (
          <Typography sx={{ color: "text.secondary" }}>
            <TierFacts tier={tier} />
          </Typography>
        )}

        {tiers.length > 1 && tier && (
          <RadioCards
            legend={t("detail.chooseOption")}
            name={`tier-${slug}`}
            value={tier.id}
            onChange={setChosenTier}
            options={tiers.map((item) => ({
              value: item.id,
              label: pick(item.label, lang),
              description: <TierFacts tier={item} />,
              aside: <TierPrice tier={item} />,
            }))}
          />
        )}

        {/* The platform fee is disclosed before the cart, never added as a surprise (plan A2). */}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("detail.feeNote", { fee: formatMoney(info.platformFeePaise, lang) })}
        </Typography>

        {service ? (
          <Sections service={service} />
        ) : details.isError ? (
          <InlineAlert
            tone="danger"
            action={
              <Button variant="tertiary" size="sm" onClick={() => void details.refetch()}>
                {t("common:action.retry")}
              </Button>
            }
          >
            {t("detail.loadError")}
          </InlineAlert>
        ) : (
          <Box role="status" sx={{ display: "grid", gap: 2 }}>
            <VisuallyHidden>{t("detail.loading")}</VisuallyHidden>
            <Skeleton aria-hidden width="40%" height={28} />
            <Skeleton aria-hidden />
            <Skeleton aria-hidden width="85%" />
            <Skeleton aria-hidden width="70%" />
          </Box>
        )}
      </Box>
    </ResponsiveDialog>
  );
}

function TierFacts({ tier }: { tier: Tier }) {
  const { t } = useTranslation("public");
  return (
    <>
      <Box component="span" sx={{ whiteSpace: "nowrap" }}>
        {durationText(t, tier.durationMin)}
      </Box>
      {tier.sessions > 1 && (
        <>
          {" · "}
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>
            {t("detail.sessions", { count: tier.sessions })}
          </Box>
        </>
      )}
    </>
  );
}

function TierPrice({ tier }: { tier: Tier }) {
  const { t, i18n } = useTranslation("public");
  const compareAt = tier.compareAtPaise ? formatMoney(tier.compareAtPaise, i18n.language) : null;
  return (
    <>
      <Box component="span" sx={{ display: "block", fontWeight: 600 }}>
        {formatMoney(tier.pricePaise, i18n.language)}
      </Box>
      {compareAt && (
        <>
          <Box component="s" aria-hidden sx={{ display: "block", typography: "body2", color: "text.secondary" }}>
            {compareAt}
          </Box>
          <VisuallyHidden>{t("detail.was", { price: compareAt })}</VisuallyHidden>
        </>
      )}
    </>
  );
}

/** Add, or the quantity once it's in the cart; focus follows the control that replaces the button. */
function SheetActions({ slug, name, tier, tierCount }: { slug: string; name: Localized | undefined; tier: Tier; tierCount: number }) {
  const { t, i18n } = useTranslation("public");
  const key = cartLineKey(slug, tier.id);
  const line = useCart((state) => state.lines.find((item) => item.key === key));
  const maxQuantity = useCart((state) => state.maxQuantity);
  const add = useCart((state) => state.add);
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const focusNext = useRef(false);
  const focusFirstButton = (node: HTMLElement | null) => {
    if (node && focusNext.current) {
      focusNext.current = false;
      node.querySelector("button")?.focus();
    }
  };
  const label = name ? pick(name, i18n.language) : "";

  if (line) {
    return (
      <Box ref={focusFirstButton} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
          <QuantityStepper
            itemLabel={label}
            value={line.quantity}
            max={maxQuantity}
            onChange={(quantity) => setQuantity(key, quantity)}
            onRemove={() => {
              focusNext.current = true;
              remove(key);
            }}
            removeLabel={t("services.remove")}
          />
          <Typography variant="body2" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}>
            {t("detail.inCart")}
          </Typography>
        </Box>
        <Button to="/cart" size="lg">
          {t("detail.goToCart")}
        </Button>
      </Box>
    );
  }

  return (
    <Box ref={focusFirstButton} sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
      <Button
        size="lg"
        sx={{ width: { xs: "100%", sm: "auto" } }}
        disabled={!name}
        onClick={() => {
          if (!name) return;
          focusNext.current = true;
          add({ serviceSlug: slug, tierId: tier.id, unitPricePaise: tier.pricePaise, name, tierLabel: tier.label, tierCount, durationMin: tier.durationMin });
        }}
      >
        {t("detail.addToCart", { price: formatMoney(tier.pricePaise, i18n.language) })}
      </Button>
    </Box>
  );
}

function Sections({ service }: { service: ServiceDto }) {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const list = (items: ReadonlyArray<Localized>) => (
    <Box component="ul" sx={{ m: 0, pl: 5, display: "grid", gap: 2 }}>
      {items.map((item) => (
        <Typography component="li" key={item.en}>
          {pick(item, lang)}
        </Typography>
      ))}
    </Box>
  );

  return (
    <>
      {service.overview.length > 0 && (
        <Section title={t("detail.includes")}>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 4 }}>
            {service.overview.map((item) => (
              <Box component="li" key={item.title.en}>
                <Typography sx={{ fontWeight: 600 }}>{pick(item.title, lang)}</Typography>
                {pick(item.desc, lang) && <Typography sx={{ mt: 0.5, color: "text.secondary" }}>{pick(item.desc, lang)}</Typography>}
              </Box>
            ))}
          </Box>
        </Section>
      )}
      {service.recommendedFor.length > 0 && <Section title={t("detail.recommendedFor")}>{list(service.recommendedFor)}</Section>}
      {service.thingsToKnow.length > 0 && <Section title={t("detail.thingsToKnow")}>{list(service.thingsToKnow)}</Section>}
      {service.products.length > 0 && <Section title={t("detail.products")}>{list(service.products)}</Section>}
      {service.aftercare.length > 0 && <Section title={t("detail.aftercare")}>{list(service.aftercare)}</Section>}
      {service.faq.length > 0 && (
        <Section title={t("detail.faq")}>
          <FaqList headingLevel="h4" items={service.faq.map((item) => ({ question: pick(item.question, lang), answer: pick(item.answer, lang) }))} />
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="h3" component="h3">
        {title}
      </Typography>
      <Box sx={{ mt: 3 }}>{children}</Box>
    </Box>
  );
}
