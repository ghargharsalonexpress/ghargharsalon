import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { type ShowToast, type ToastAction, ToastContext } from "./toastContext";

interface ToastMessage {
  id: number;
  message: string;
  action?: ToastAction;
}

const AUTO_HIDE_MS = 4000;
// The snackbar stays out of the first page load (plan C15) and is fetched once the page is idle,
// so the first toast still appears at once.
const loadToastView = () => import("./ToastView");
const ToastView = lazy(loadToastView);

/**
 * Toasts confirm completed background actions only ("Saved", "Copied").
 * Errors that need action use InlineAlert or Banner instead (plan B8).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [open, setOpen] = useState(false);
  const current = queue[0];

  const show = useCallback<ShowToast>((message, options) => {
    setQueue((items) => [...items, { id: Date.now() + Math.random(), message, action: options?.action }]);
    setOpen(true);
  }, []);

  const handleExited = () => {
    setQueue((items) => {
      const rest = items.slice(1);
      if (rest.length) setOpen(true);
      return rest;
    });
  };

  const value = useMemo(() => show, [show]);

  useEffect(() => {
    const prefetch = () => void loadToastView().catch(() => undefined);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prefetch, { timeout: 4_000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(prefetch, 2_000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current && (
        <Suspense fallback={null}>
          <ToastView current={current} open={open} autoHideMs={AUTO_HIDE_MS} onClose={() => setOpen(false)} onExited={handleExited} />
        </Suspense>
      )}
    </ToastContext.Provider>
  );
}
