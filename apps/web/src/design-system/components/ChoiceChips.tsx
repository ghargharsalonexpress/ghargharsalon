import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import MuiChip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

export interface ChoiceChip {
  id: string;
  label: ReactNode;
}

export interface ChoiceChipsProps {
  /** Accessible name of the group, e.g. "Categories". */
  label: string;
  options: ReadonlyArray<ChoiceChip>;
  /** null = nothing selected ("All"). */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Phones: one row that scrolls sideways with snap and an edge fade (plan B9). */
  scrollable?: boolean;
}

/** Single-choice chips; choosing the selected one again clears it. */
export function ChoiceChips({ label, options, value, onChange, scrollable = false }: ChoiceChipsProps) {
  const { tokens } = useTheme();
  const fade = `linear-gradient(to right, transparent, ${tokens.neutral[0]} 85%)`;

  return (
    <Box sx={{ position: "relative", minWidth: 0 }}>
      <Box
        role="group"
        aria-label={label}
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: scrollable ? { xs: "nowrap", md: "wrap" } : "wrap",
          overflowX: scrollable ? { xs: "auto", md: "visible" } : "visible",
          scrollSnapType: scrollable ? "x proximity" : undefined,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: scrollable ? { xs: 1, md: 0 } : 0,
          pr: scrollable ? { xs: 8, md: 0 } : 0,
        }}
      >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <MuiChip
              key={option.id}
              label={option.label}
              variant="outlined"
              clickable
              onClick={() => onChange(selected ? null : option.id)}
              aria-pressed={selected}
              sx={{
                flexShrink: 0,
                scrollSnapAlign: "start",
                ...(selected ? { borderColor: tokens.accent[600], bgcolor: tokens.accent[50], color: tokens.accent[700], "&&:hover": { bgcolor: tokens.accent[100] } } : {}),
              }}
            />
          );
        })}
      </Box>
      {scrollable && (
        <Box aria-hidden sx={{ display: { xs: "block", md: "none" }, position: "absolute", top: 0, right: 0, bottom: 4, width: 32, background: fade, pointerEvents: "none" }} />
      )}
    </Box>
  );
}
