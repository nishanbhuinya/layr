/** A LAYR font value: `font:` accepts it wherever it accepts a family name. */
export interface FontValue {
  $: "font";
  family: string;
  fallback: string;
}

export interface FontOptions {
  /** Weights to load, e.g. `[400, 700]`. Default: every weight of a variable family, else regular. */
  weights?: number[];
  italic?: boolean;
  /** The generic stack shown until the font loads. Guessed from the name by default. */
  fallback?: string;
}

/** "PlayfairDisplay" → "Playfair Display". */
export function familyName(key: string): string;
export function familyQuery(family: string, options?: FontOptions): string;
/** A stylesheet URL for a `<link rel="stylesheet">` in the head. */
export function href(...families: Array<string | ({ family: string } & FontOptions)>): string;
export function font(family: string, options?: FontOptions): FontValue;
export function preload(...families: Array<string | ({ family: string } & FontOptions)>): void;

export declare const GoogleFonts: {
  font: typeof font;
  href: typeof href;
  preload: typeof preload;
} & { readonly [family: string]: FontValue };

export default GoogleFonts;
