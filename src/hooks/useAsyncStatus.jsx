import { useState, useCallback } from "react";

/**
 * useAsyncStatus()
 * A clean hook to manage loader and success state for async operations.
 */
export default function useAsyncStatus() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // show loader
  const showLoader = useCallback(() => setLoading(true), []);

  // hide loader
  const hideLoader = useCallback(() => setLoading(false), []);

  // show success page
  const showSuccess = useCallback(() => {
    setSuccess(true);
    setLoading(false);
  }, []);

  // reset all
  const resetStatus = useCallback(() => {
    setLoading(false);
    setSuccess(false);
  }, []);

  return {
    loading,
    success,
    showLoader,
    hideLoader,
    showSuccess,
    resetStatus,
  };
}
