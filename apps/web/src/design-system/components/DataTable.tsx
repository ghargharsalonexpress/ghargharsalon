import { type ReactNode, useMemo, useState } from "react";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { VisuallyHidden } from "./VisuallyHidden";

const nowrap = (on?: boolean) => (on ? "nowrap" : undefined);

export interface Column<Row> {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** primary = card title on phones, secondary = shown on the card, tertiary = desktop only. */
  priority: "primary" | "secondary" | "tertiary";
  align?: "left" | "right";
  /** Provide to make the column sortable. */
  sortValue?: (row: Row) => string | number;
  width?: number | string;
  /** Keep on one line: IDs, amounts, dates. */
  nowrap?: boolean;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: ReadonlyArray<Column<Row>>;
  rows: ReadonlyArray<Row>;
  getRowId: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** Accessible name of each row's open button, e.g. "Open booking BK-1234". */
  rowLabel?: (row: Row) => string;
  /** Status pill etc. shown at the top-right of each mobile card. */
  mobileAside?: (row: Row) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
}

type Sort = { columnId: string; direction: "asc" | "desc" } | null;

/**
 * Admin table pattern (plan B8): sticky header, sortable columns, row -> details.
 * Below 900px it becomes a card list so nothing scrolls sideways.
 */
export function DataTable<Row>({ caption, columns, rows, getRowId, onRowClick, rowLabel, mobileAside, loading = false, empty }: DataTableProps<Row>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isCards = useMediaQuery(theme.breakpoints.down("md"));
  const [sort, setSort] = useState<Sort>(null);
  const n = theme.tokens.neutral;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return rows;
    const value = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return (va > vb ? 1 : va < vb ? -1 : 0) * factor;
    });
  }, [rows, columns, sort]);

  const toggleSort = (columnId: string) =>
    setSort((current) =>
      current?.columnId === columnId ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" } : { columnId, direction: "asc" },
    );

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  if (isCards) {
    const primary = columns.find((c) => c.priority === "primary");
    const secondary = columns.filter((c) => c.priority === "secondary");
    return (
      <Box component="ul" aria-label={caption} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
        {(loading ? Array.from({ length: 3 }) : sorted).map((row, index) => {
          const key = loading ? `skeleton-${index}` : getRowId(row as Row);
          const content = loading ? (
            <Box sx={{ p: 4 }}>
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, p: 4 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* The aside (status) drops under the title when both don't fit on one line. */}
                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", columnGap: 3, rowGap: 1, alignItems: "flex-start" }}>
                  <Typography component="span" sx={{ fontWeight: 600, whiteSpace: nowrap(primary?.nowrap) }}>
                    {primary?.cell(row as Row)}
                  </Typography>
                  {mobileAside?.(row as Row)}
                </Box>
                <Box component="dl" sx={{ m: 0, mt: 1, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 3, rowGap: 0.5 }}>
                  {secondary.map((column) => (
                    <Box key={column.id} sx={{ display: "contents" }}>
                      <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
                        {column.header}
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0, whiteSpace: nowrap(column.nowrap) }}>
                        {column.cell(row as Row)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {onRowClick && <ChevronRightOutlined sx={{ color: n[500] }} aria-hidden />}
            </Box>
          );
          return (
            <Box
              component="li"
              key={key}
              sx={{ border: `1px solid ${n[200]}`, borderRadius: `${theme.tokens.radius.md}px`, bgcolor: n[0] }}
            >
              {onRowClick && !loading ? (
                <Box
                  component="button"
                  type="button"
                  onClick={() => onRowClick(row as Row)}
                  sx={{
                    all: "unset",
                    display: "block",
                    width: "100%",
                    cursor: "pointer",
                    borderRadius: `${theme.tokens.radius.md}px`,
                    "&:focus-visible": { outline: `2px solid ${theme.tokens.accent[600]}`, outlineOffset: 2 },
                  }}
                >
                  {content}
                </Box>
              ) : (
                content
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <TableContainer sx={{ border: `1px solid ${n[200]}`, borderRadius: `${theme.tokens.radius.md}px`, maxHeight: 640 }}>
      <Table stickyHeader size="medium">
        <VisuallyHidden component="caption">{caption}</VisuallyHidden>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                sx={{ width: column.width, whiteSpace: nowrap(column.nowrap) }}
                sortDirection={sort?.columnId === column.id ? sort.direction : false}
              >
                {column.sortValue ? (
                  <TableSortLabel
                    active={sort?.columnId === column.id}
                    direction={sort?.columnId === column.id ? sort.direction : "asc"}
                    onClick={() => toggleSort(column.id)}
                  >
                    {column.header}
                  </TableSortLabel>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
            {onRowClick && (
              <TableCell sx={{ width: 48 }}>
                <VisuallyHidden>{t("table.open")}</VisuallyHidden>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton />
                    </TableCell>
                  ))}
                  {onRowClick && <TableCell />}
                </TableRow>
              ))
            : sorted.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{ fontVariantNumeric: column.align === "right" ? "tabular-nums" : undefined, whiteSpace: nowrap(column.nowrap) }}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {onRowClick && (
                    <TableCell align="right">
                      <Box
                        component="button"
                        type="button"
                        aria-label={rowLabel ? rowLabel(row) : `${t("table.open")} ${getRowId(row)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRowClick(row);
                        }}
                        sx={{
                          all: "unset",
                          display: "inline-flex",
                          cursor: "pointer",
                          color: n[500],
                          borderRadius: `${theme.tokens.radius.sm}px`,
                          "&:focus-visible": { outline: `2px solid ${theme.tokens.accent[600]}`, outlineOffset: 2 },
                        }}
                      >
                        <ChevronRightOutlined />
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
