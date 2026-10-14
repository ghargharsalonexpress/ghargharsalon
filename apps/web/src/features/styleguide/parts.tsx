import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export function Section({
  id,
  title,
  description,
  rules,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  rules?: ReadonlyArray<string>;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={`${id}-title`}
      sx={{ scrollMarginTop: 96, py: { xs: 10, md: 14 }, borderTop: `1px solid ${tokens.neutral[200]}` }}
    >
      <Typography id={`${id}-title`} variant="h2">
        {title}
      </Typography>
      {description && <Typography sx={{ mt: 2, color: "text.secondary", maxWidth: "72ch" }}>{description}</Typography>}
      {rules && rules.length > 0 && (
        <Box component="ul" sx={{ mt: 4, mb: 0, pl: 5, display: "grid", gap: 1, color: "text.secondary", typography: "body2", maxWidth: "80ch" }}>
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </Box>
      )}
      <Box sx={{ mt: 8, display: "grid", gap: 8 }}>{children}</Box>
    </Box>
  );
}

/** Framed demo area with a small caption above it. */
export function Specimen({ label, children, subtle = false }: { label: string; children: ReactNode; subtle?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Box>
      <Typography variant="caption" component="h3" sx={{ m: 0, mb: 2, color: "text.secondary", fontWeight: 600 }}>
        {label}
      </Typography>
      <Box
        sx={{
          border: `1px solid ${tokens.neutral[200]}`,
          borderRadius: `${tokens.radius.md}px`,
          bgcolor: subtle ? tokens.neutral[25] : tokens.neutral[0],
          p: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Horizontal wrap of demo items with consistent gaps. */
export function Row({ children, align = "center" }: { children: ReactNode; align?: "center" | "flex-start" }) {
  return <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: align }}>{children}</Box>;
}

export function Grid({ children, min = 280 }: { children: ReactNode; min?: number }) {
  return <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` }}>{children}</Box>;
}
