/**
 * Consent lives in the privacy runtime shared by the three DynShift sites (public/privacy.js, loaded
 * first in the head by the site plugin): Consent Mode defaults, analytics only after consent, lazy ad
 * slots, Global Privacy Control, and the Privacy settings panel. This only connects the footer's
 * control, which LAYR code calls as `window.layrPrivacySettings`, to that panel.
 */
type Privacy = { open: () => void; usOptOut: () => void };
const w = window as unknown as { dynshiftPrivacy?: Privacy; layrPrivacySettings: () => void; layrUsOptOut: () => void };
w.layrPrivacySettings = () => w.dynshiftPrivacy?.open();
// The footer's Do Not Sell or Share control (shown only where a US state regulation applies).
w.layrUsOptOut = () => w.dynshiftPrivacy?.usOptOut();

// Readers who answered the old banner are asked once more under the new, shared notice.
try {
  localStorage.removeItem("layr-consent");
} catch {
  // Storage blocked: nothing to remove.
}
