/**
 * An ad slot. Renders nothing unless both the publisher id and this placement's ad-unit id are set
 * at build time (repository variables), so an unconfigured build has no ads and no empty boxes.
 * When configured it reserves its height up front, so the page never shifts when the ad arrives.
 * Placements are decided in the pages: the home band, one Library slot, the docs rail at xl.
 */
import { useEffect, useRef } from "react";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? "";
const SLOTS: Record<string, string | undefined> = {
  home: import.meta.env.VITE_AD_SLOT_HOME,
  library: import.meta.env.VITE_AD_SLOT_LIBRARY,
  docs: import.meta.env.VITE_AD_SLOT_DOCS,
};

export function Ad({ placement, height = 250 }: { placement: string; height?: number }) {
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
      // Blocked by the reader's browser: the reserved space simply stays empty.
    }
  }, [slot]);
  if (!CLIENT || !slot) return null;
  return (
    <aside className="ad" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins className="adsbygoogle" style={{ display: "block", minHeight: height }} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
