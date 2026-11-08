// Basis URL short link/QR: selalu origin aplikasi yang sedang berjalan.
// (Env NEXT_PUBLIC_SHORT_DOMAIN dicabut 2026-11-08: domain pajangan yang
// tak menjalankan app hanya menghasilkan QR mati.)
export function shortBase() {
  if (typeof location !== "undefined") return location.origin;
  return "";
}
