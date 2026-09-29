/**
 * An ad slot. Renders nothing unless both the publisher id and this placement's ad-unit id are set
 * at build time (repository variables), so an unconfigured build has no ads and no empty boxes, and
 * nothing on a legal page (privacy, cookies, terms, contact) whatever the page asks.
 * It takes no room and shows no label until Google has actually filled it: where the ad script is
 * blocked, slow or has nothing to show, the page shows nothing at all.
 * Loading is the shared DynShift privacy runtime's job (public/privacy.js): it pushes a slot only as
 * it nears the viewport, and adds restricted data processing under Global Privacy Control.
 * Placements are decided in the pages: the home band, one Library slot, the docs rail at xl.
 */
import { useEffect } from "react";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? "";
const SLOTS: Record<string, string | undefined> = {
  home: import.meta.env.VITE_AD_SLOT_HOME,
  library: import.meta.env.VITE_AD_SLOT_LIBRARY,
  docs: import.meta.env.VITE_AD_SLOT_DOCS,
};
const LEGAL = /^\/(privacy|cookies|terms|contact)(\/|$)/;

/** `height` is kept for the pages that pass it; the slot no longer reserves space before an ad arrives. */
export function Ad({ placement }: { placement: string; height?: number }) {
  const slot = SLOTS[placement];
  const legal = typeof location !== "undefined" && LEGAL.test(location.pathname);
  const on = Boolean(CLIENT && slot) && !legal;
  useEffect(() => {
    if (!on) return;
    (window as unknown as { dynshiftAds?: { mount: () => void } }).dynshiftAds?.mount();
  }, [on]);
  if (!on) return null;
  return (
    <aside className="ad" data-ad-slot-lazy="" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
