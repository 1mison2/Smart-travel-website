const EMAIL_DOMAIN_TYPO_BLOCKLIST = new Set([
  "gmail.con",
  "yahoo.con",
  "hotmail.con",
  "outlook.con",
]);

export const validateEmail = (email) => {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes(" ") || value.includes(",")) return false;

  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  if (!domain.includes(".")) return false;
  if (EMAIL_DOMAIN_TYPO_BLOCKLIST.has(domain)) return false;

  const labels = domain.split(".");
  const tld = labels[labels.length - 1];

  if (!/^[a-z]{2,24}$/.test(tld)) return false;
  if (tld === "con") return false;

  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
};

export const validateFullName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.length >= 2;
};
