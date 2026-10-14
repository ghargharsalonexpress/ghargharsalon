import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { VisuallyHidden } from "../VisuallyHidden";

export interface RadioCardOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  /** Right-aligned detail, e.g. the price. */
  aside?: ReactNode;
  disabled?: boolean;
}

export interface RadioCardsProps<T extends string> {
  legend: string;
  showLegend?: boolean;
  name: string;
  value: T | null;
  onChange: (value: T) => void;
  options: ReadonlyArray<RadioCardOption<T>>;
}

/**
 * One choice from a short list of rich options (service tiers, saved addresses). Native radio
 * inputs keep arrow-key navigation and announcements; the whole card is the click target.
 */
export function RadioCards<T extends string>({ legend, showLegend = true, name, value, onChange, options }: RadioCardsProps<T>) {
  const { tokens } = useTheme();
  const n = tokens.neutral;
  const a = tokens.accent;

  return (
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      {showLegend ? (
        <Box component="legend" sx={{ typography: "label", color: "text.primary", mb: 2, p: 0 }}>
          {legend}
        </Box>
      ) : (
        <VisuallyHidden component="legend">{legend}</VisuallyHidden>
      )}
      <Box sx={{ display: "grid", gap: 2 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Box
              key={option.value}
              component="label"
              sx={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                alignItems: "start",
                columnGap: 3,
                p: 4,
                borderRadius: `${tokens.radius.md}px`,
                border: `1px solid ${selected ? a[600] : n[300]}`,
                boxShadow: selected ? `inset 0 0 0 1px ${a[600]}` : "none",
                bgcolor: n[0],
                cursor: option.disabled ? "not-allowed" : "pointer",
                opacity: option.disabled ? 0.6 : 1,
                transition: `border-color ${tokens.motion.duration.fast}ms`,
                "&:hover": { borderColor: selected ? a[600] : n[500] },
                "&:has(input:focus-visible)": { outline: `2px solid ${a[600]}`, outlineOffset: 2 },
              }}
            >
              <Box
                component="input"
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                sx={{ width: 20, height: 20, m: 0, mt: 0.5, accentColor: a[600], cursor: "inherit", "&:focus-visible": { outline: "none" } }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ typography: "body1", fontWeight: 600, color: "text.primary" }}>{option.label}</Box>
                {option.description && <Box sx={{ typography: "body2", color: "text.secondary", mt: 0.5 }}>{option.description}</Box>}
              </Box>
              {option.aside && <Box sx={{ textAlign: "right", typography: "body1", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{option.aside}</Box>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
