declare module "virtual:site/docs" {
  export const nav: Array<{ title: string; items: Array<{ slug: string; title: string; href: string }> }>;
  export const slugs: string[];
  export const loaders: Record<string, () => Promise<{ default: unknown }>>;
  export const index: Array<{ slug: string; title: string; description: string; section: string }>;
}
declare module "virtual:site/reference" {
  // biome-ignore lint/suspicious/noExplicitAny: generated data
  const ref: any;
  export default ref;
}
declare module "virtual:site/library" {
  // biome-ignore lint/suspicious/noExplicitAny: generated data
  const lib: any[];
  export default lib;
}
declare module "virtual:site/home" {
  // biome-ignore lint/suspicious/noExplicitAny: generated data
  const home: any;
  export default home;
}
interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_AD_SLOT_HOME?: string;
  readonly VITE_AD_SLOT_LIBRARY?: string;
  readonly VITE_AD_SLOT_DOCS?: string;
  readonly VITE_GA_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module "virtual:site/search" {
  const items: Array<{ t: string; s: string; h: string; k: string }>;
  export default items;
}
declare module "virtual:site/examples" {
  const examples: Array<{ id: string; title: string; code: string }>;
  export default examples;
}
declare module "virtual:site/page/*" {
  const page: { slug: string; title: string; description: string; section: string; html: string; toc: Array<{ id: string; text: string; depth: number }>; edit: string };
  export default page;
}
