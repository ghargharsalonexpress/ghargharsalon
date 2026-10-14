import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { brand } from "@/brand";
import { InlineAlert, Link } from "@/design-system";
import { NotFoundContent } from "@/features/system/NotFoundPage";
import { formatDate, formatMoney } from "@/lib/format";
import { useInfo } from "./info";
import { usePageMeta } from "./usePageMeta";

const LEGAL_DOCS = ["privacy", "terms", "cancellation-refund"] as const;
type LegalDoc = (typeof LEGAL_DOCS)[number];
const isLegalDoc = (value: string | undefined): value is LegalDoc => (LEGAL_DOCS as readonly string[]).includes(value ?? "");

/** When the drafts were last changed; update with every content change. */
const UPDATED = new Date(2026, 9, 5);

interface Section {
  heading: string;
  body?: string;
  items?: string[];
}

/**
 * Policies in a reading layout (plan A13: drafts until the client's legal adviser approves).
 * Fees and contacts come from settings and brand config, so the text never drifts from the product.
 */
export function LegalPage() {
  const { doc } = useParams();
  if (!isLegalDoc(doc)) return <NotFoundContent />;
  return <LegalDocument doc={doc} />;
}

function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { t, i18n } = useTranslation("legal");
  const { tokens } = useTheme();
  const info = useInfo();
  const lang = i18n.language;

  const values = {
    brand: brand.name,
    company: t("placeholders.company"),
    address: t("placeholders.address"),
    grievance: t("placeholders.grievance"),
    city: t("placeholders.city"),
    support: `${brand.supportEmail} · ${brand.supportPhone}`,
    cancelFee: formatMoney(info.fees.cancelAfterAcceptPaise, lang),
    noShowFee: formatMoney(info.fees.noShowPaise, lang),
    lateMinutes: info.lateThresholdMinutes,
    waitMinutes: info.noShowWaitMinutes,
    searchTime: t("common:time.minutes", { count: Math.max(1, Math.round(info.searchTimeoutSeconds / 60)) }),
    date: formatDate(UPDATED, lang),
  };
  const title = t(`docs.${doc}.title`);
  const sections = t(`docs.${doc}.sections`, { returnObjects: true, ...values }) as Section[];

  usePageMeta(title, t(`docs.${doc}.intro`, values));

  return (
    <Container maxWidth={false} component="article" sx={{ maxWidth: tokens.container.reading, py: { xs: 8, md: 16 } }}>
      <Typography variant="h1">{title}</Typography>
      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
        {t("updated", values)}
      </Typography>
      <Box sx={{ mt: 6 }}>
        <InlineAlert tone="info">{t("draftNotice", values)}</InlineAlert>
      </Box>
      <Typography variant="bodyLg" component="p" sx={{ mt: 8 }}>
        {t(`docs.${doc}.intro`, values)}
      </Typography>

      {sections.map((section, index) => (
        <Box key={section.heading} component="section" aria-labelledby={`legal-${index}`} sx={{ mt: { xs: 8, md: 10 } }}>
          <Typography id={`legal-${index}`} variant="h2">
            {section.heading}
          </Typography>
          {section.body && <Typography sx={{ mt: 3 }}>{section.body}</Typography>}
          {section.items && (
            <Box component="ul" sx={{ m: 0, mt: 3, pl: 5, display: "grid", gap: 2 }}>
              {section.items.map((item) => (
                <Typography component="li" key={item}>
                  {item}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      ))}

      <Box component="nav" aria-label={t("otherPolicies")} sx={{ mt: { xs: 12, md: 16 }, pt: 6, borderTop: `1px solid ${tokens.neutral[200]}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {LEGAL_DOCS.filter((other) => other !== doc).map((other) => (
          <Link key={other} to={`/legal/${other}`} standalone>
            {t(`docs.${other}.title`)}
          </Link>
        ))}
      </Box>
    </Container>
  );
}
