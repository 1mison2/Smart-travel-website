const AUTH_REDIRECT_KEY = "st_auth_redirect";

export const setAuthRedirect = (path) => {
  if (typeof window === "undefined") return;
  if (typeof path !== "string" || !path.startsWith("/")) return;
  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
};

export const getAuthRedirect = () => {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(AUTH_REDIRECT_KEY) || "";
};

export const clearAuthRedirect = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_REDIRECT_KEY);
};
