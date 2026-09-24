// The LAYR icon set: 24px stroke icons that take the current text colour. Importing the addon registers them for the core Icon widget.
import { icons } from "@dynshift/layr/react";

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  "arrow-right": svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  "arrow-left": svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  "arrow-up": svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  "arrow-down": svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  "chevron-right": svg('<path d="M9 6l6 6-6 6"/>'),
  "chevron-left": svg('<path d="M15 6l-6 6 6 6"/>'),
  "chevron-up": svg('<path d="M6 15l6-6 6 6"/>'),
  "chevron-down": svg('<path d="M6 9l6 6 6-6"/>'),
  "check": svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  "x": svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  "plus": svg('<path d="M12 5v14M5 12h14"/>'),
  "minus": svg('<path d="M5 12h14"/>'),
  "menu": svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  "search": svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  "star": svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
  "heart": svg('<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>'),
  "home": svg('<path d="M4 11l8-7 8 7M6 9.5V20h4.5v-5h3v5H18V9.5"/>'),
  "user": svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>'),
  "settings": svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),
  "external-link": svg('<path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5"/>'),
  "copy": svg('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2"/>'),
  "sun": svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  "moon": svg('<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>'),
  "info": svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.5v.5"/>'),
  "alert": svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'),
  "mail": svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  "calendar": svg('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  "clock": svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  "download": svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>'),
  "upload": svg('<path d="M12 16V5M7 9.5l5-5 5 5M5 19.5h14"/>'),
  "trash": svg('<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 12.5h8L17 7"/>'),
  "edit": svg('<path d="M5 19l1-4L15.5 5.5l3 3L9 18z"/><path d="M13.5 7.5l3 3"/>'),
  "link": svg('<path d="M10 14l4-4M8.5 11.5l-2 2a3.2 3.2 0 0 0 4.5 4.5l2-2M15.5 12.5l2-2a3.2 3.2 0 0 0-4.5-4.5l-2 2"/>'),
  "code": svg('<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>'),
  "layers": svg('<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5"/><path d="M3.5 16.5L12 21l8.5-4.5"/>'),
  "grid": svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>'),
  "play": svg('<path d="M8 5.5v13l10-6.5z"/>'),
  "github": svg('<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.4c0-1 .1-1.4-.5-2 2.6-.3 5.5-1.3 5.5-5.8a4.5 4.5 0 0 0-1.2-3.1 4.2 4.2 0 0 0-.1-3.1s-1-.3-3.2 1.2a11 11 0 0 0-5.8 0C5.5 3.3 4.5 3.6 4.5 3.6a4.2 4.2 0 0 0-.1 3.1A4.5 4.5 0 0 0 3.2 9.8c0 4.5 2.9 5.5 5.5 5.8-.6.6-.6 1.2-.5 2V21"/>'),
};

icons(ICONS);
