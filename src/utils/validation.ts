export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const DEFAULT_FEATURE_USAGE = {
  "form": 1,
  "video": 1,
  "project": 1,
  "remove_brand": false,
  "max_testimoni": 10,
  "unlimited_tag": false,
  "showcase_page": 1,
  "unlimited_import_social_media": true,
} as const;
