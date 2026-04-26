const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein",
  "welcome123",
  "admin123",
  "smarttravel",
  "travel123",
]);

const EMAIL_DOMAIN_TYPO_BLOCKLIST = new Set([
  "gmail.con",
  "yahoo.con",
  "hotmail.con",
  "outlook.con",
]);

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasSequentialChars = (value) => {
  const normalized = String(value || "").toLowerCase();
  const sequences = [
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "qwertyuiopasdfghjklzxcvbnm",
  ];

  return sequences.some((sequence) => {
    for (let index = 0; index <= sequence.length - 4; index += 1) {
      const slice = sequence.slice(index, index + 4);
      const reversed = slice.split("").reverse().join("");
      if (normalized.includes(slice) || normalized.includes(reversed)) return true;
    }
    return false;
  });
};

const hasRepeatedChars = (value) => /(.)\1{3,}/.test(String(value || ""));

const validateEmail = (email) => {
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

const validateFullName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.length >= 2;
};

const validatePasswordStrength = ({ password, email = "", name = "" }) => {
  const value = String(password || "");
  const lower = value.toLowerCase();
  const feedback = [];

  if (value.length < 8) feedback.push("Password must be at least 8 characters.");
  if (!/[a-z]/.test(value)) feedback.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(value)) feedback.push("Password must include an uppercase letter.");
  if (!/\d/.test(value)) feedback.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(value)) feedback.push("Password must include a special character.");
  if (COMMON_PASSWORDS.has(lower)) feedback.push("Password is too common. Choose a less predictable password.");
  if (hasSequentialChars(value)) feedback.push("Password cannot contain obvious sequences like 1234 or abcd.");
  if (hasRepeatedChars(value)) feedback.push("Password cannot contain repeated characters like aaaa.");

  const emailPrefix = String(email || "").split("@")[0].trim();
  if (emailPrefix && emailPrefix.length >= 3) {
    const emailPattern = new RegExp(escapeRegExp(emailPrefix.toLowerCase()), "i");
    if (emailPattern.test(lower)) {
      feedback.push("Password cannot contain your email name.");
    }
  }

  const nameParts = String(name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  if (nameParts.some((part) => lower.includes(part))) {
    feedback.push("Password cannot contain your name.");
  }

  return {
    valid: feedback.length === 0,
    feedback,
  };
};

module.exports = {
  validateEmail,
  validateFullName,
  validatePasswordStrength,
};
