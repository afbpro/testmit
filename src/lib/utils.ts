import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SmartTextMode = "none" | "name" | "email" | "sentence" | "title";

const smallWords = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "en", "al"]);

function normalizeSpacing(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/^[ \t]+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/(\s+)/)
    .map((part, index) => {
      if (/^\s+$/.test(part)) {
        return part;
      }

      const cleanPart = part.trim();

      if (index > 0 && smallWords.has(cleanPart)) {
        return cleanPart;
      }

      return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1);
    })
    .join("");
}

function toSentenceCase(value: string) {
  const lowerCased = value.toLowerCase();

  return lowerCased.replace(/(^|[.!?]\s+|\n+)([a-záéíóúñü])/g, (match, prefix, letter) => {
    return `${prefix}${letter.toUpperCase()}`;
  });
}

export function formatSmartText(value: string, mode: SmartTextMode = "none") {
  const cleanedValue = normalizeSpacing(value);

  switch (mode) {
    case "email":
      return cleanedValue.toLowerCase();
    case "name":
    case "title":
      return toTitleCase(cleanedValue);
    case "sentence":
      return toSentenceCase(cleanedValue);
    default:
      return cleanedValue;
  }
}
