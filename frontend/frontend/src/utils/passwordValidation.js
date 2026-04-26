export const validatePasswordStrength = ({ password, email = "", name = "" }) => {
  const value = String(password || "");
  const lower = value.toLowerCase();
  const feedback = [];
  const commonPasswords = new Set([
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

  const hasSequentialChars = (input) => {
    const normalized = String(input || "").toLowerCase();
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

  if (value.length < 8) feedback.push("At least 8 characters");
  if (!/[a-z]/.test(value)) feedback.push("One lowercase letter");
  if (!/[A-Z]/.test(value)) feedback.push("One uppercase letter");
  if (!/\d/.test(value)) feedback.push("One number");
  if (!/[^A-Za-z0-9]/.test(value)) feedback.push("One special character");
  if (commonPasswords.has(lower)) feedback.push("Avoid common passwords");
  if (hasSequentialChars(value)) feedback.push("Avoid sequences like 1234 or abcd");
  if (/(.)\1{3,}/.test(value)) feedback.push("Avoid repeated characters");

  const emailPrefix = String(email || "").split("@")[0].trim().toLowerCase();
  if (emailPrefix && emailPrefix.length >= 3 && lower.includes(emailPrefix)) {
    feedback.push("Cannot contain your email name");
  }

  const nameParts = String(name || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3);
  if (nameParts.some((part) => lower.includes(part))) {
    feedback.push("Cannot contain your name");
  }

  return {
    valid: feedback.length === 0,
    feedback,
  };
};
