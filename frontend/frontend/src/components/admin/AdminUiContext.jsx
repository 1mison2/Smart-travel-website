import React, { useCallback, useMemo, useRef, useState } from "react";
import { AdminUiContext } from "./adminUiContextValue";

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AdminUiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(({ title, message = "", tone = "success", duration = 3600 }) => {
    const id = createToastId();
    setToasts((prev) => [...prev, { id, title, message, tone }]);
    const timer = window.setTimeout(() => dismissToast(id), duration);
    toastTimersRef.current.set(id, timer);
    return id;
  }, [dismissToast]);

  const value = useMemo(
    () => ({
      toasts,
      dismissToast,
      showToast,
    }),
    [dismissToast, showToast, toasts]
  );

  return <AdminUiContext.Provider value={value}>{children}</AdminUiContext.Provider>;
}
