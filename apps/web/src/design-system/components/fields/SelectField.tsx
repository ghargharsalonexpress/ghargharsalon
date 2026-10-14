import { type ReactNode, useId } from "react";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import MuiSelect, { type SelectChangeEvent } from "@mui/material/Select";
import { describedBy, fieldIds } from "./fieldA11y";
import { FieldShell } from "./FieldShell";

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string> {
  label: ReactNode;
  value: T | "";
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  optional,
  disabled,
  id: idProp,
  name,
}: SelectFieldProps<T>) {
  const autoId = useId();
  const id = idProp ?? `select-${autoId}`;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} disabled={disabled}>
      <MuiSelect<T | "">
        id={id}
        name={name}
        labelId={fieldIds(id).label}
        value={value}
        displayEmpty={Boolean(placeholder)}
        disabled={disabled}
        error={Boolean(error)}
        onChange={(event: SelectChangeEvent<T | "">) => onChange(event.target.value as T)}
        input={<OutlinedInput />}
        SelectDisplayProps={{ "aria-describedby": describedBy(id, hint, error) } as Record<string, string | undefined>}
        renderValue={(selected) =>
          selected === "" ? <span>{placeholder}</span> : options.find((option) => option.value === selected)?.label
        }
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </FieldShell>
  );
}
