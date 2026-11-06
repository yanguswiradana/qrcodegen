export function shortBase() {
  const env = process.env.NEXT_PUBLIC_SHORT_DOMAIN?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof location !== "undefined") return location.origin;
  return "";
}
