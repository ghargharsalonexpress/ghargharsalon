import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export interface EmptyStateProps {
  /** What is empty, e.g. "No past bookings yet". */
  title: ReactNode;
  /** One sentence: why, or what happens next. */
  description: ReactNode;
  /** One action at most. */
  action?: ReactNode;
  /** Optional small icon; never an illustration (plan B8). */
  icon?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
}

export function EmptyState({ title, description, action, icon, headingLevel = "h2" }: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <Box sx={{ textAlign: "center", maxWidth: 420, mx: "auto", py: { xs: 10, md: 16 }, px: 4 }}>
      {icon && (
        <Box
          aria-hidden
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            mb: 4,
            borderRadius: `${tokens.radius.full}px`,
            bgcolor: tokens.neutral[50],
            color: tokens.neutral[600],
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h3" component={headingLevel}>
        {title}
      </Typography>
      <Typography sx={{ mt: 2, color: "text.secondary" }}>{description}</Typography>
      {action && <Box sx={{ mt: 6 }}>{action}</Box>}
    </Box>
  );
}
