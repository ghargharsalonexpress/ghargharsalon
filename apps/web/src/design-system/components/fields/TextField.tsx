import { type ReactNode, type Ref, useId } from "react";
import OutlinedInput, { type OutlinedInputProps } from "@mui/material/OutlinedInput";
import { describedBy } from "./fieldA11y";
import { FieldShell } from "./FieldShell";

export interface TextFieldProps extends Omit<OutlinedInputProps, "error" | "size" | "label" | "ref"> {
  label: ReactNode;
  hint?: ReactNode;
  /** Error text; shown under the field and linked with aria-describedby. */
  error?: ReactNode;
  optional?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function TextField({ label, hint, error, optional, id: idProp, disabled, slotProps, fullWidth = true, ref, ...rest }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? `field-${autoId}`;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} disabled={disabled} fullWidth={fullWidth}>
      <OutlinedInput
        ref={ref}
        id={id}
        disabled={disabled}
        error={Boolean(error)}
        fullWidth={fullWidth}
        slotProps={{
          ...slotProps,
          input: {
            ...slotProps?.input,
            "aria-describedby": describedBy(id, hint, error),
            "aria-invalid": error ? true : undefined,
          },
        }}
        {...rest}
      />
    </FieldShell>
  );
}
