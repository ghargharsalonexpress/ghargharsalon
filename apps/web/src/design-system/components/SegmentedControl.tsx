import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { VisuallyHidden } from "./VisuallyHidden";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group; shown visually only when `showLabel` is true. */
  label: string;
  showLabel?: boolean;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentOption<T>>;
  size?: "md" | "lg";
  fullWidth?: boolean;
}

/**
 * 2-4 mutually exclusive options. Built on native radio inputs so arrow keys,
 * form semantics and screen-reader announcements work without extra code.
 */
export function SegmentedControl<T extends string>({
  label,
  showLabel = false,
  name,
  value,
  onChange,
  options,
  size = "md",
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const { tokens: t } = useTheme();
  const n = t.neutral;
  const height = size === "lg" ? 48 : 40;

  return (
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      {showLabel ? (
        <Box component="legend" sx={{ typography: "label", color: "text.primary", mb: 1.5, p: 0 }}>
          {label}
        </Box>
      ) : (
        <VisuallyHidden component="legend">{label}</VisuallyHidden>
      )}
      <Box
        sx={{
          display: fullWidth ? "flex" : "inline-flex",
          width: fullWidth ? "100%" : "auto",
          gap: 1,
          p: 1,
          bgcolor: n[100],
          borderRadius: `${t.radius.md}px`,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Box
              key={option.value}
              component="label"
              sx={{
                flex: fullWidth ? 1 : "0 0 auto",
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: height - 8,
                px: 4,
                borderRadius: `${t.radius.sm}px`,
                border: "1px solid",
                borderColor: selected ? n[300] : "transparent",
                bgcolor: selected ? n[0] : "transparent",
                color: selected ? n[900] : n[600],
                typography: "label",
                fontWeight: selected ? 600 : 500,
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
                transition: `background-color ${t.motion.duration.fast}ms, color ${t.motion.duration.fast}ms`,
                "&:hover": { color: n[900] },
                "&:has(input:focus-visible)": { outline: `2px solid ${t.accent[600]}`, outlineOffset: 2 },
                "@media (pointer: coarse)": { minHeight: Math.max(height - 8, t.touchTarget.default - 8) },
              }}
            >
              <VisuallyHidden
                component="input"
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
