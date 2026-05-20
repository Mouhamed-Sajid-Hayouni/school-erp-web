const rawApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

if (!rawApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is missing");
}

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
