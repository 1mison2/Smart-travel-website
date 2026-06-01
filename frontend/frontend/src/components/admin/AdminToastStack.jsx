import React from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useAdminUi } from "./adminUiContextValue";

const toneIcons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
  warning: CircleAlert,
};

export default function AdminToastStack() {
  const { toasts, dismissToast } = useAdminUi();

  if (!toasts.length) return null;

  return (
    <div className="admin-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = toneIcons[toast.tone] || Info;
        return (
          <article key={toast.id} className={`admin-toast admin-toast--${toast.tone}`}>
            <div className="admin-toast__icon">
              <Icon size={18} />
            </div>
            <div className="admin-toast__copy">
              <strong>{toast.title}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="admin-toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
