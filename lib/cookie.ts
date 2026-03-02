const COOKIE_NAME = "auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function setAuthCookie() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=1; path=/; SameSite=Lax${secure}; max-age=${MAX_AGE_SECONDS}`;
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; SameSite=Lax; max-age=0`;
}
