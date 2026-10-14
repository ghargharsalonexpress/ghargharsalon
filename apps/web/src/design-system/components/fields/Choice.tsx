import { type ChangeEvent, type ReactNode, useId } from "react";
import Box from "@mui/material/Box";
import MuiCheckbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import MuiRadio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import MuiSwitch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

function ChoiceLabel({ label, description, descriptionId }: { label: ReactNode; description?: ReactNode; descriptionId: string }) {
  return (
    <Box sx={{ py: 2.5 }}>
      <Typography component="span" sx={{ display: "block" }}>
        {label}
      </Typography>
      {description && (
        <Typography id={descriptionId} variant="body2" component="span" sx={{ display: "block", color: "text.secondary" }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

interface ToggleProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export function Checkbox({ label, description, checked, onChange, disabled, name }: ToggleProps) {
  const descriptionId = `${useId()}-description`;
  return (
    <FormControlLabel
      disabled={disabled}
      sx={{ alignItems: "flex-start" }}
      control={
        <MuiCheckbox
          name={name}
          checked={checked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
          slotProps={{ input: { "aria-describedby": description ? descriptionId : undefined } }}
        />
      }
      label={<ChoiceLabel label={label} description={description} descriptionId={descriptionId} />}
    />
  );
}

export function Switch({ label, description, checked, onChange, disabled, name }: ToggleProps) {
  const descriptionId = `${useId()}-description`;
  return (
    <FormControlLabel
      disabled={disabled}
      sx={{ alignItems: "flex-start" }}
      control={
        <MuiSwitch
          name={name}
          checked={checked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
          slotProps={{ input: { role: "switch", "aria-describedby": description ? descriptionId : undefined } }}
        />
      }
      label={<ChoiceLabel label={label} description={description} descriptionId={descriptionId} />}
    />
  );
}

export interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupFieldProps<T extends string> {
  legend: ReactNode;
  value: T | null;
  onChange: (value: T) => void;
  options: ReadonlyArray<RadioOption<T>>;
  name: string;
  error?: ReactNode;
}

export function RadioGroupField<T extends string>({ legend, value, onChange, options, name, error }: RadioGroupFieldProps<T>) {
  const errorId = `${useId()}-error`;
  return (
    <FormControl component="fieldset" error={Boolean(error)}>
      <FormLabel component="legend">{legend}</FormLabel>
      <RadioGroup
        name={name}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value as T)}
        aria-describedby={error ? errorId : undefined}
      >
        {options.map((option) => {
          const descriptionId = `${name}-${option.value}-description`;
          return (
            <FormControlLabel
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              sx={{ alignItems: "flex-start" }}
              control={<MuiRadio slotProps={{ input: { "aria-describedby": option.description ? descriptionId : undefined } }} />}
              label={<ChoiceLabel label={option.label} description={option.description} descriptionId={descriptionId} />}
            />
          );
        })}
      </RadioGroup>
      {error && <FormHelperText id={errorId}>{error}</FormHelperText>}
    </FormControl>
  );
}
