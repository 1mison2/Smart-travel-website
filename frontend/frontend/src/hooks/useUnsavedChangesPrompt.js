import { useEffect } from "react";

export default function useUnsavedChangesPrompt(enabled, message = "You have unsaved changes. Are you sure you want to leave this page?") {
  useEffect(() => {
    if (!enabled) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, message]);
}
