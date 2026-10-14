import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";

export interface PriceLine {
  id: string;
  label: ReactNode;
  /** Line total in paise (unit price × quantity). */
  amountPaise: number;
  quantity?: number;
}

export interface PriceSummaryProps {
  lines: ReadonlyArray<PriceLine>;
  platformFeePaise: number;
  totalPaise: number;
  /** Shown under the total; defaults to "Taxes included" (prices include GST, ADR-0010). */
  note?: ReactNode;
}

/** Server-computed breakdown rendered as a description list. Amounts are tabular. */
export function PriceSummary({ lines, platformFeePaise, totalPaise, note }: PriceSummaryProps) {
  const { t, i18n } = useTranslation();
  const { tokens } = useTheme();
  const money = (paise: number) => formatMoney(paise, i18n.language);

  const row = { display: "flex", justifyContent: "space-between", gap: 4, py: 1.5 } as const;
  const amount = { m: 0, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

  return (
    <Box>
      <Box component="dl" sx={{ m: 0 }}>
        {lines.map((line) => (
          <Box key={line.id} sx={row}>
            <Typography component="dt" sx={{ color: "text.primary" }}>
              {line.label}
              {line.quantity && line.quantity > 1 ? (
                <Box component="span" sx={{ color: "text.secondary" }}>{` × ${line.quantity}`}</Box>
              ) : null}
            </Typography>
            <Typography component="dd" sx={amount}>
              {money(line.amountPaise)}
            </Typography>
          </Box>
        ))}
        <Box sx={row}>
          <Typography component="dt" sx={{ color: "text.secondary" }}>
            {t("price.platformFee")}
          </Typography>
          <Typography component="dd" sx={{ ...amount, color: "text.secondary" }}>
            {money(platformFeePaise)}
          </Typography>
        </Box>
        <Box sx={{ ...row, mt: 2, pt: 3, borderTop: `1px solid ${tokens.neutral[200]}` }}>
          <Typography component="dt" variant="h3">
            {t("price.total")}
          </Typography>
          <Typography component="dd" variant="h3" sx={amount}>
            {money(totalPaise)}
          </Typography>
        </Box>
      </Box>
      {/* Outside the <dl>: description lists may only contain dt/dd groups. */}
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", textAlign: "right", m: 0 }}>
        {note ?? t("price.taxesIncluded")}
      </Typography>
    </Box>
  );
}
