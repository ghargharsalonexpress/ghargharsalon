import type { UseFormRegisterReturn } from "react-hook-form";

/** Adapts react-hook-form's register() to the design-system fields (input ref is `inputRef`). */
export function fieldProps<T extends string>({ ref, ...rest }: UseFormRegisterReturn<T>) {
  return { ...rest, inputRef: ref };
}
