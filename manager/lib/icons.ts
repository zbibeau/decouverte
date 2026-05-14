/**
 * List of icon keys available in the Solid app's `public/icons/` folder.
 * These are the values that go into a block's `payload.main.icon` (or
 * `exception.icon`) field. The matching SVG file is served by the Solid
 * app at `/icons/<key>.svg`.
 *
 * Keep this list in sync if new icons are added to the Solid app.
 */
export const ICON_KEYS = [
  'add-line',
  'arrow-down-s-line',
  'arrow-left',
  'arrow-right',
  'calendar-todo-fill',
  'check-fill',
  'check-line',
  'circle-40-percent',
  'circle-60-percent',
  'close',
  'hand-coin-fill',
  'home-fill',
  'lightbulb-fill',
  'loop-right-line',
  'menu-line',
  'money-euro-circle',
  'moon-clear-fill',
  'pause-circle-fill',
  'play-btn-alt',
  'play-circle-fill',
  'questionnaire-fill',
  'refresh-line',
  'send-plane-fill',
  'square-stetho',
  'subtract-line',
  'sun-fill',
  'team-fill',
  'toolbox1-alice-infos',
  'toolbox1-summary-alice',
  'toolbox1-summary-decrease',
  'toolbox1-summary-pricing',
  'toolbox1-summary-privacy',
  'toolbox1-summary-rules',
  'toolbox1-summary-secAway',
  'toolbox2-documents',
  'toolbox2-notifications',
  'toolbox2-org',
  'toolbox2-teleconsult',
  'toolbox3-campaign',
  'toolbox3-inbox',
  'toolbox3-infos',
  'toolbox3-messages',
  'toolbox3-sms',
  'toolbox3-website',
  'user-fill',
  'user-search',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

/** URL of the icon SVG hosted by the Solid app. */
export function iconUrl(key: string, clientUrl = 'http://localhost:3100'): string {
  return `${clientUrl}/icons/${key}.svg`;
}
