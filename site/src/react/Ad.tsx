/**
 * An ad slot. Renders nothing unless both the publisher id and this placement's ad-unit id are set
 * at build time (repository variables), so an unconfigured build has no ads and no empty boxes.
 * It takes no room and shows no label until Google has actually filled it: where the ad script is
 * blocked, slow or has nothing to show (a site still under review), the page shows nothing at all.
 * Placements are decided in the pages: the home band, one Library slot, the docs rail at xl.
 */
import { useEffect, useRef } from "react";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? "";
const SLOTS: Record<string, string | undefined> = {
  home: import.meta.env.VITE_AD_SLOT_HOME,
  library: import.meta.env.VITE_AD_SLOT_LIBRARY,
  docs: import.meta.env.VITE_AD_SLOT_DOCS,
};

/** `height` is kept for the pages that pass it; the slot no longer reserves space before an ad arrives. */
export function Ad({ placement }: { placement: string; height?: number }) {
  const slot = SLOTS[placement];
  const pushed = useRef(false);
  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
    } catch {
      // Blocked by the reader's browser: the slot stays empty and takes no room.
    }
  }, [slot]);
  if (!CLIENT || !slot) return null;
  return (
    <aside className="ad" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
