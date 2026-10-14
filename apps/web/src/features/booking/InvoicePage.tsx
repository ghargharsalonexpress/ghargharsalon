import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Button, EmptyState, Link, VisuallyHidden } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { invoiceQuery } from "./api";

/**
 * Tax invoice (plan C9): a printable page; the browser's "Save as PDF" makes the file. Amounts
 * show paise here, unlike the rest of the site (plan B10).
 */
export function InvoicePage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const { tokens } = useTheme();
  const invoice = useQuery(invoiceQuery(id));
  usePageMeta(invoice.data ? t("invoice.metaTitle", { number: invoice.data.number }) : t("invoice.title"));
  const money = (paise: number) => formatMoney(paise, lang, { decimals: true });

  const toolbar = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3, flexWrap: "wrap", mb: 6, "@media print": { display: "none" } }}>
      <Link to={`/bookings/${id}`} standalone>
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <ArrowBackOutlined aria-hidden sx={{ fontSize: 18 }} />
          {t("invoice.back")}
        </Box>
      </Link>
      {invoice.data && (
        <Button variant="secondary" startIcon={<PrintOutlined />} onClick={() => window.print()}>
          {t("invoice.print")}
        </Button>
      )}
    </Box>
  );

  if (!invoice.data) {
    return (
      <Box component="main" id="main" sx={{ maxWidth: 840, mx: "auto", px: { xs: 4, md: 8 }, py: { xs: 6, md: 10 } }}>
        {toolbar}
        {invoice.isError ? (
          <EmptyState
            headingLevel="h1"
            title={t("invoice.errorTitle")}
            description={errorText(t, invoice.error)}
            action={
              <Button variant="secondary" onClick={() => void invoice.refetch()}>
                {t("common:action.retry")}
              </Button>
            }
          />
        ) : (
          <Box aria-busy sx={{ display: "grid", gap: 4 }}>
            <Skeleton variant="text" width="40%" height={44} />
            <Skeleton variant="rounded" height={320} />
          </Box>
        )}
      </Box>
    );
  }

  const data = invoice.data;
  const cell = { py: 2.5, px: 2, borderBottom: `1px solid ${tokens.neutral[200]}`, textAlign: "left", verticalAlign: "top" } as const;
  const num = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

  return (
    <Box component="main" id="main" sx={{ maxWidth: 840, mx: "auto", px: { xs: 4, md: 8 }, py: { xs: 6, md: 10 }, "@media print": { p: 0, maxWidth: "none" } }}>
      {toolbar}
      <Box component="article" aria-labelledby="invoice-title" sx={{ border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 5, md: 10 }, bgcolor: tokens.neutral[0], "@media print": { border: 0, p: 0 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{data.seller.name}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>
              {data.seller.address}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("invoice.gstin", { gstin: data.seller.gstin })}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {data.seller.phone} · {data.seller.email}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { sm: "right" } }}>
            <Typography id="invoice-title" variant="h1" sx={{ typography: "h2" }}>
              {t("invoice.title")}
            </Typography>
            <Typography variant="body2">{t("invoice.number", { number: data.number })}</Typography>
            <Typography variant="body2">{t("invoice.date", { date: formatDate(new Date(data.issuedAt), lang) })}</Typography>
            <Typography variant="body2">{t("invoice.booking", { number: data.bookingNumber })}</Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 8 }}>
          <Typography variant="label" component="p" sx={{ m: 0, color: "text.secondary" }}>
            {t("invoice.billedTo")}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>{data.buyer.name}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {data.buyer.address}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {data.buyer.phone}
          </Typography>
        </Box>

        {/* Narrow screens scroll the table sideways; the region takes focus so keyboards can too. */}
        <Box role="region" aria-label={t("invoice.linesCaption")} tabIndex={0} sx={{ mt: 8, overflowX: "auto", "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 } }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", typography: "body2" }}>
            <VisuallyHidden component="caption">{t("invoice.linesCaption")}</VisuallyHidden>
            <thead>
              <tr>
                <Box component="th" scope="col" sx={{ ...cell, fontWeight: 600 }}>
                  {t("invoice.description")}
                </Box>
                <Box component="th" scope="col" sx={{ ...cell, fontWeight: 600 }}>
                  {t("invoice.sac")}
                </Box>
                <Box component="th" scope="col" sx={{ ...num, fontWeight: 600 }}>
                  {t("invoice.quantity")}
                </Box>
                <Box component="th" scope="col" sx={{ ...num, fontWeight: 600 }}>
                  {t("invoice.taxable")}
                </Box>
                <Box component="th" scope="col" sx={{ ...num, fontWeight: 600 }}>
                  {t("invoice.gst")}
                </Box>
                <Box component="th" scope="col" sx={{ ...num, fontWeight: 600 }}>
                  {t("invoice.amount")}
                </Box>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, index) => (
                <tr key={`${line.description}-${index}`}>
                  <Box component="td" sx={cell}>
                    {line.description}
                  </Box>
                  <Box component="td" sx={cell}>
                    {line.sac}
                  </Box>
                  <Box component="td" sx={num}>
                    {formatNumber(line.quantity, lang)}
                  </Box>
                  <Box component="td" sx={num}>
                    {money(line.taxablePaise)}
                  </Box>
                  <Box component="td" sx={num}>
                    {money(line.gstPaise)}
                  </Box>
                  <Box component="td" sx={num}>
                    {money(line.totalPaise)}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>

        <Box component="dl" sx={{ mt: 6, ml: "auto", maxWidth: 360, display: "grid", gridTemplateColumns: "1fr auto", columnGap: 6, rowGap: 2, typography: "body2" }}>
          <dt>{t("invoice.taxableTotal")}</dt>
          <Box component="dd" sx={{ m: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {money(data.taxablePaise)}
          </Box>
          <dt>{t("invoice.gstLine", { rate: formatNumber(data.gstRateBps / 100, lang) })}</dt>
          <Box component="dd" sx={{ m: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {money(data.gstPaise)}
          </Box>
          <Box component="dt" sx={{ fontWeight: 600, pt: 2, borderTop: `1px solid ${tokens.neutral[200]}` }}>
            {t("invoice.total")}
          </Box>
          <Box component="dd" sx={{ m: 0, pt: 2, borderTop: `1px solid ${tokens.neutral[200]}`, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {money(data.totalPaise)}
          </Box>
        </Box>

        <Box sx={{ mt: 8, display: "grid", gap: 1 }}>
          {data.paymentId && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("invoice.paidOnline", { id: data.paymentId })}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("invoice.footer")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
