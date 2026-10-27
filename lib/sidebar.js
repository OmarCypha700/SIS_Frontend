export const SIDEBAR_COOKIE = "sis_sidebar";

/** Remember the desktop sidebar state for a year (not sensitive; read by the server to render the right width). */
export function saveSidebarCollapsed(collapsed) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; SameSite=Lax`;
}
