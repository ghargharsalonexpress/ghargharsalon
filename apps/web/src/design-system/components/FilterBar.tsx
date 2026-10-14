import type { ReactNode } from "react";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import MuiChip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useUrlText } from "../hooks/useUrlText";
import { Button } from "./Button";

export interface FilterChip {
  id: string;
  label: ReactNode;
  selected: boolean;
}

export interface FilterBarProps {
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  chips?: ReadonlyArray<FilterChip>;
  onToggleChip?: (id: string) => void;
  onClearAll?: () => void;
  /** e.g. a "More filters" button that opens a drawer on phones. */
  extra?: ReactNode;
}

/** Search + toggle chips + clear. Callers keep the state in the URL (plan B8). */
export function FilterBar({ searchLabel, search, onSearchChange, chips = [], onToggleChip, onClearAll, extra }: FilterBarProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const searchField = useUrlText(search, onSearchChange);
  const anyActive = search.length > 0 || chips.some((chip) => chip.selected);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
        <OutlinedInput
          {...searchField}
          placeholder={searchLabel}
          type="search"
          startAdornment={
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" />
            </InputAdornment>
          }
          slotProps={{ input: { "aria-label": searchLabel } }}
          sx={{ flex: "1 1 240px", maxWidth: 420 }}
        />
        {extra}
        {anyActive && onClearAll && (
          <Button variant="tertiary" onClick={onClearAll}>
            {t("action.clear")}
          </Button>
        )}
      </Box>
      {chips.length > 0 && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <MuiChip
              key={chip.id}
              label={chip.label}
              variant="outlined"
              clickable
              onClick={() => onToggleChip?.(chip.id)}
              aria-pressed={chip.selected}
              sx={
                chip.selected
                  ? { borderColor: tokens.accent[600], bgcolor: tokens.accent[50], color: tokens.accent[700], "&&:hover": { bgcolor: tokens.accent[100] } }
                  : undefined
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
