import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, InlineAlert, PageHeader, PriceSummary, PublicShell, SegmentedControl } from "@/design-system";
import { formatMoney } from "@/lib/format";
import { usePublicNav } from "./navigation";

type Preference = "any" | "female" | "male";

const TOTAL_PAISE = 104_900;

export function CheckoutSample() {
  const { t, i18n } = useTranslation("samples");
  const { tokens } = useTheme();
  const nav = usePublicNav();
  const [preference, setPreference] = useState<Preference>("any");
  const n = tokens.neutral;
  const total = formatMoney(TOTAL_PAISE, i18n.language);

  const card = {
    border: `1px solid ${n[200]}`,
    borderRadius: `${tokens.radius.md}px`,
    p: { xs: 5, md: 6 },
    bgcolor: n[0],
  } as const;

  return (
    <PublicShell nav={nav} cartCount={2} cartTo="/samples/checkout" accountLabel={t("nav.account")} accountTo="/samples/checkout" footer={false}>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        <PageHeader title={t("checkout.title")} />
        <Box sx={{ display: "grid", gap: { xs: 6, md: 10 }, gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, alignItems: "start" }}>
          <Box sx={{ display: "grid", gap: 6 }}>
            <Box component="section" aria-labelledby="where-title" sx={card}>
              <Typography id="where-title" variant="h3" component="h2">
                {`1. ${t("checkout.whereTitle")}`}
              </Typography>
              <Box sx={{ mt: 4, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4, p: 4, border: `2px solid ${tokens.accent[600]}`, borderRadius: `${tokens.radius.md}px` }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{t("checkout.addressLabel")}</Typography>
                  <Typography sx={{ color: "text.secondary" }}>{t("checkout.addressLine")}</Typography>
                </Box>
                <Button variant="tertiary" size="sm">
                  {t("checkout.change")}
                </Button>
              </Box>
            </Box>

            <Box component="section" aria-labelledby="who-title" sx={card}>
              <Typography id="who-title" variant="h3" component="h2" sx={{ mb: 4 }}>
                {`2. ${t("checkout.whoTitle")}`}
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

            <InlineAlert tone="success" title={t("checkout.availableTitle")}>
              {t("checkout.arrives", { range: t("common:duration.range", { min: 12, max: 18 }) })}
            </InlineAlert>
          </Box>

          <Box component="section" aria-labelledby="review-title" sx={{ ...card, position: { md: "sticky" }, top: { md: 88 } }}>
            <Typography id="review-title" variant="h3" component="h2" sx={{ mb: 4 }}>
              {`3. ${t("checkout.reviewTitle")}`}
            </Typography>
            <PriceSummary
              lines={[
                { id: "facial", label: t("checkout.items.facial"), amountPaise: 64_900 },
                { id: "wax", label: t("checkout.items.wax"), amountPaise: 39_000 },
              ]}
              platformFeePaise={1_100}
              totalPaise={TOTAL_PAISE}
            />
            <Box sx={{ display: { xs: "none", md: "block" }, mt: 6 }}>
              <Button size="lg" fullWidth>
                {t("checkout.pay", { amount: total })}
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
              {t("checkout.payNote")}
            </Typography>
          </Box>
        </Box>
      </Container>
      {/* The amount lives on the button ("Pay ₹1,049"), so the left side says what it buys instead of repeating it. */}
      <ActionBar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="label" component="p" sx={{ m: 0 }}>
            {t("home.servicesCount", { count: 2 })}
          </Typography>
          <Typography variant="caption" component="p" sx={{ m: 0, color: "text.secondary" }}>
            {t("common:price.taxesIncluded")}
          </Typography>
        </Box>
        <Button size="lg">{t("checkout.pay", { amount: total })}</Button>
      </ActionBar>
    </PublicShell>
  );
}
