/**
 * Runs once per page load, outside React: the analytics consent banner and the footer's
 * "Privacy settings" control. Analytics exists only when VITE_GA_ID is set, and loads only after
 * the reader accepts. Advertising consent is Google's own message, delivered by the AdSense loader.
 */
const GA_ID = import.meta.env.VITE_GA_ID ?? "";
const KEY = "layr-consent";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

function loadAnalytics() {
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag() {
    // biome-ignore lint/complexity/noArguments: gtag reads the arguments object
    w.dataLayer.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });
}

function banner() {
  const box = document.createElement("div");
  box.className = "consent";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Analytics");
  box.innerHTML = `<p>May LAYR count page views with Google Analytics? It helps decide which docs to improve. Nothing is loaded unless you accept. <a href="/privacy">Privacy</a></p><div><button type="button" data-consent="yes">Accept</button><button type="button" data-consent="no">Decline</button></div>`;
  box.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).getAttribute("data-consent");
    if (!v) return;
    write(v);
    box.remove();
    if (v === "yes") loadAnalytics();
  });
  document.body.appendChild(box);
}

if (GA_ID) {
  const choice = read();
  if (choice === "yes") loadAnalytics();
  else if (choice === null) banner();
}

/** Reopens the consent choices: Google's message for ads (where it applies) and ours for analytics. */
(window as unknown as { layrPrivacySettings: () => void }).layrPrivacySettings = () => {
  const g = window as unknown as { googlefc?: { showRevocationMessage?: () => void; callbackQueue?: unknown[] } };
  if (g.googlefc?.showRevocationMessage) g.googlefc.showRevocationMessage();
  if (GA_ID) {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    if (!document.querySelector(".consent")) banner();
  }
};
