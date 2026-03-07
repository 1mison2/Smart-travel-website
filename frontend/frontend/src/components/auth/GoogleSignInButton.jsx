import React, { useEffect, useRef } from "react";

let googleScriptPromise;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity='true']");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

export default function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
  text = "signin_with",
}) {
  const buttonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let active = true;

    const render = async () => {
      if (!clientId || !buttonRef.current) return;
      try {
        await loadGoogleScript();
        if (!active || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onError?.("Google sign-in did not return a credential");
              return;
            }
            onCredential(response.credential);
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          width: buttonRef.current.offsetWidth || 360,
        });
      } catch (_err) {
        onError?.("Failed to load Google sign-in");
      }
    };

    render();
    return () => {
      active = false;
    };
  }, [clientId, onCredential, onError, text]);

  if (!clientId) {
    return (
      <p style={{ color: "#e53e3e", fontSize: "0.85rem", margin: 0 }}>
        Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.
      </p>
    );
  }

  return (
    <div style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div ref={buttonRef} />
    </div>
  );
}
