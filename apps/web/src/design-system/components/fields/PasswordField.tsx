import { useState } from "react";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import { useTranslation } from "react-i18next";
import { IconButton } from "../IconButton";
import { TextField, type TextFieldProps } from "./TextField";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "endAdornment">;

export function PasswordField({ autoComplete = "current-password", sx = [], ...props }: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      // Edge adds its own eye button to password inputs; ours already shows and hides it.
      sx={[{ "& input::-ms-reveal, & input::-ms-clear": { display: "none" } }, ...(Array.isArray(sx) ? sx : [sx])]}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      endAdornment={
        <InputAdornment position="end">
          <IconButton
            label={visible ? t("action.hidePassword") : t("action.showPassword")}
            onClick={() => setVisible((value) => !value)}
            aria-pressed={visible}
            edge="end"
          >
            {visible ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
          </IconButton>
        </InputAdornment>
      }
    />
  );
}
