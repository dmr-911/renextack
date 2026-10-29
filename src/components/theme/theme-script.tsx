/**
 * Runs synchronously before first paint to apply the saved theme, so there is
 * no light-to-dark flash. Kept tiny and dependency-free on purpose.
 * Storage key: "theme" = "light" | "dark" | "system" (default).
 */
export const THEME_STORAGE_KEY = "theme";

const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark");}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script
      // React warns about rendering <script> on the client; the server-only type swap avoids it.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
