import React, { useEffect, useRef } from "react";

let googleScriptPromise;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity='true']");
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
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

  return googleScriptPromise.catch((error) => {
    googleScriptPromise = undefined;
    throw error;
  });
};

const buildGoogleErrorMessage = (error) => {
  const rawMessage = String(error?.message || error || "").trim();
  const lower = rawMessage.toLowerCase();

  if (lower.includes("origin") && lower.includes("not allowed")) {
    return `Google sign-in is blocked for this site origin (${window.location.origin}). Add it to Authorized JavaScript origins in Google Cloud Console.`;
  }

  if (lower.includes("network") || lower.includes("load")) {
    return "Google sign-in script could not load. Check internet access, browser extensions, or privacy blocking.";
  }

  return rawMessage || "Failed to load Google sign-in";
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

        buttonRef.current.innerHTML = "";

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
      } catch (err) {
        console.error("Google sign-in initialization failed:", err);
        onError?.(buildGoogleErrorMessage(err));
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
