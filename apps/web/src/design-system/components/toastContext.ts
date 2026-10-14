import { createContext, useContext } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export type ShowToast = (message: string, options?: { action?: ToastAction }) => void;

export const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
