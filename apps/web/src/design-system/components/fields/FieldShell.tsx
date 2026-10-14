import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import { useTranslation } from "react-i18next";
import { fieldIds } from "./fieldA11y";

export interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Marks the field "(optional)". Required fields are unmarked (plan B8). */
  optional?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

/** Label above, control, then hint or error below. Shared by every text-like field. */
export function FieldShell({ id, label, hint, error, optional, disabled, fullWidth = true, children }: FieldShellProps) {
  const { t } = useTranslation();
  const ids = fieldIds(id);

  return (
    <FormControl fullWidth={fullWidth} error={Boolean(error)} disabled={disabled}>
      <FormLabel id={ids.label} htmlFor={id}>
        {label}
        {optional && (
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, ml: 1 }}>
            {t("field.optional")}
          </Box>
        )}
      </FormLabel>
      {children}
      {error ? (
        <FormHelperText id={ids.error}>{error}</FormHelperText>
      ) : hint ? (
        <FormHelperText id={ids.hint}>{hint}</FormHelperText>
      ) : null}
    </FormControl>
  );
}
