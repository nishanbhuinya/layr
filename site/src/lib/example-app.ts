/**
 * The app every example on this site runs in. Examples use the site's theme tokens (`panel`, `ink`,
 * `accent`, `teal`…) instead of fixed colours, so a preview follows the reader's theme, and the code
 * says what the reader sees. A snippet's own `App(.theme(...))` adds to or overrides those tokens,
 * and its own `DesignScale` replaces the default one.
 */
type ReadApp = typeof import("@dynshift/layr/compiler").readAppConfig;
type AppConfig = ReturnType<ReadApp>;

export function exampleApp(read: ReadApp, siteApp: string, code: string, path = "src/pages/index.layr"): Pick<AppConfig, "theme" | "designScale"> {
  const site = read(siteApp);
  const own = /\b(App|Theme|DesignScale)\s*\(/.test(code) ? read(code, path) : null;
  const base = read(null);
  if (!own) return { theme: site.theme, designScale: base.designScale };
  const dark = { ...site.theme.dark };
  // A token the snippet sets for light only is its colour in both schemes, not the site's dark one.
  for (const k of Object.keys(own.theme.colors)) if (!(k in own.theme.dark)) delete dark[k];
  return {
    theme: {
      ...site.theme,
      ...own.theme,
      colors: { ...site.theme.colors, ...own.theme.colors },
      dark: { ...dark, ...own.theme.dark },
      fonts: { ...site.theme.fonts, ...own.theme.fonts },
    },
    designScale: /\bDesignScale\s*\(/.test(code) ? own.designScale : base.designScale,
  };
}
