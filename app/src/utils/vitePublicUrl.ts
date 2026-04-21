/**
 * Archivos bajo `public/` con la `base` de Vite (`vite.config` → `base: './'`).
 * Evita rutas tipo `/assets/...` que en WebView o `file://` apuntan al origen equivocado.
 */
export function vitePublicUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const clean = path.replace(/^\/+/, '');
  return prefix + clean;
}
