import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import MuiPagination from "@mui/material/Pagination";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/format";
import { IconButton } from "./IconButton";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * Numbered pages with a count (admin). Phones get "‹ Page 1 of 7 ›" so the control
 * never wraps. Customer and professional history use "Load more" instead.
 */
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const lang = i18n.language;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, flexWrap: "wrap", mt: 4 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("table.rowsShown", { from: formatNumber(from, lang), to: formatNumber(to, lang), total: formatNumber(total, lang) })}
      </Typography>
      {isPhone ? (
        <Box component="nav" aria-label={t("table.pagination")} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton label={t("table.previousPage")} disabled={page <= 1} onClick={() => onChange(page - 1)} tooltip={false}>
            <ChevronLeftOutlined />
          </IconButton>
          <Typography variant="body2" aria-live="polite" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {t("table.pageOf", { page: formatNumber(page, lang), pages: formatNumber(pages, lang) })}
          </Typography>
          <IconButton label={t("table.nextPage")} disabled={page >= pages} onClick={() => onChange(page + 1)} tooltip={false}>
            <ChevronRightOutlined />
          </IconButton>
        </Box>
      ) : (
        <MuiPagination
          count={pages}
          page={page}
          onChange={(_, next) => onChange(next)}
          shape="rounded"
          aria-label={t("table.pagination")}
          getItemAriaLabel={(type, item, selected) => {
            if (type === "page") return selected ? t("table.currentPage", { page: item }) : t("table.goToPage", { page: item });
            return type === "next" || type === "last" ? t("table.nextPage") : t("table.previousPage");
          }}
        />
      )}
    </Box>
  );
}
