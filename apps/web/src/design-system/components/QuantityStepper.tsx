import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { IconButton } from "./IconButton";

export interface QuantityStepperProps {
  /** Name of the item, used in the group's accessible name. */
  itemLabel: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** When given, the decrease button becomes "Remove" at the minimum. */
  onRemove?: () => void;
  removeLabel?: string;
}

export function QuantityStepper({ itemLabel, value, onChange, min = 1, max = 3, onRemove, removeLabel }: QuantityStepperProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const atMin = value <= min;
  const showRemove = atMin && onRemove;

  return (
    <Box
      role="group"
      aria-label={itemLabel}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${tokens.neutral[300]}`,
        borderRadius: `${tokens.radius.sm}px`,
        bgcolor: "background.paper",
      }}
    >
      {showRemove ? (
        <IconButton label={removeLabel ?? t("action.clear")} size="sm" onClick={onRemove}>
          <DeleteOutlineOutlined fontSize="small" />
        </IconButton>
      ) : (
        <IconButton label={t("action.decreaseQuantity")} size="sm" onClick={() => onChange(value - 1)} disabled={atMin}>
          <RemoveOutlined fontSize="small" />
        </IconButton>
      )}
      <Box
        component="output"
        aria-live="polite"
        sx={{ minWidth: 32, textAlign: "center", typography: "label", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Box>
      <IconButton label={t("action.increaseQuantity")} size="sm" onClick={() => onChange(value + 1)} disabled={value >= max}>
        <AddOutlined fontSize="small" />
      </IconButton>
    </Box>
  );
}
