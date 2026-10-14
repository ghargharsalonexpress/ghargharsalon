import type { ChangeEvent } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { formatIndianMobile, mobileDigits } from "@brand/shared";
import { TextField, type TextFieldProps } from "./TextField";

export interface PhoneFieldProps extends Omit<TextFieldProps, "value" | "onChange" | "type" | "startAdornment"> {
  /** Ten digits, no spaces or country code. */
  value: string;
  onChange: (digits: string) => void;
}

/** Shows "98765 43210" while storing "9876543210". The +91 prefix is fixed (India only). */
export function PhoneField({ value, onChange, ...props }: PhoneFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(mobileDigits(event.target.value));
  };

  return (
    <TextField
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      value={formatIndianMobile(value)}
      onChange={handleChange}
      startAdornment={
        <InputAdornment position="start">
          <Typography component="span" aria-hidden>
            +91
          </Typography>
        </InputAdornment>
      }
      // Room for a pasted "+91 98765 43210"; mobileDigits() trims it to ten digits.
      slotProps={{ ...props.slotProps, input: { ...props.slotProps?.input, maxLength: 16 } }}
    />
  );
}
