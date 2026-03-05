/**
 * EasyOref — Internationalization (i18n)
 *
 * Supported languages: Russian (ru), English (en), Hebrew (he)
 * Default: ru (built for diaspora families)
 */

export type Language = "ru" | "en" | "he";

export interface MessageTemplates {
  earlyWarning: (areas: string, time: string) => string;
  siren: (areas: string, time: string) => string;
  resolved: (areas: string) => string;
}

const ru: MessageTemplates = {
  earlyWarning: (areas, _time) =>
    [
      "<b>\u{1F680} Раннее предупреждение</b>",
      "",
      `Зафиксированы запуски ракет: ${areas}`,
      "Подлётное время: ~5–12 минут",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>\u{1F6A8} Сирена</b>",
      "",
      `Район: ${areas}`,
      `Время оповещения: ${time}`,
      "Подлётное время: 1.5 минуты",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>\u{1F62E}\u200D\u{1F4A8} Инцидент завершён</b>",
      `Район: ${areas}`,
      "Больше не нужно находиться рядом с укрытием.",
    ].join("\n"),
};

const en: MessageTemplates = {
  earlyWarning: (areas, _time) =>
    [
      "<b>\u{1F680} Early Warning</b>",
      "",
      `Rocket launches detected towards: ${areas}`,
      "Estimated arrival: ~5–12 minutes",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>\u{1F6A8} Siren Alert</b>",
      "",
      `Area: ${areas}`,
      `Alert time: ${time}`,
      "Time to shelter: 1.5 minutes",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>\u{1F62E}\u200D\u{1F4A8} Incident Over</b>",
      `Area: ${areas}`,
      "You no longer need to stay near shelter.",
    ].join("\n"),
};

const he: MessageTemplates = {
  earlyWarning: (areas, _time) =>
    [
      "<b>\u{1F680} התרעה מוקדמת</b>",
      "",
      `זוהו שיגורים לעבר: ${areas}`,
      "זמן מעוף משוער: ~5–12 דקות",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>\u{1F6A8} צבע אדום</b>",
      "",
      `אזור: ${areas}`,
      `שעת התרעה: ${time}`,
      "זמן מעוף: 1.5 דקות",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>\u{1F62E}\u200D\u{1F4A8} האירוע הסתיים</b>",
      `אזור: ${areas}`,
      "אין צורך להישאר בקרבת מרחב מוגן.",
    ].join("\n"),
};

const templates: Record<Language, MessageTemplates> = { ru, en, he };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Area Name Translation — loaded from pikud-haoref-api/cities.json
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CITIES_JSON_URL =
  "https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json";

interface CityEntry {
  name: string;
  name_en: string;
  name_ru: string;
  name_ar: string;
  zone: string;
  zone_en: string;
  zone_ru: string;
  zone_ar: string;
}

type LangKey = "en" | "ru";

/** Hebrew city name → { en, ru } */
const cityMap = new Map<string, Record<LangKey, string>>();
/** Hebrew zone name → { en, ru } */
const zoneMap = new Map<string, Record<LangKey, string>>();

/**
 * Load and cache translations from pikud-haoref-api.
 * Must be called once at startup (before first alert).
 * Falls back silently to Hebrew names on fetch failure.
 */
export async function initTranslations(): Promise<void> {
  try {
    const res = await fetch(CITIES_JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CityEntry[] = (await res.json()) as CityEntry[];

    for (const c of data) {
      if (!c.name || c.name === "בחר הכל") continue;
      cityMap.set(c.name, { en: c.name_en, ru: c.name_ru });
      if (c.zone && !zoneMap.has(c.zone)) {
        zoneMap.set(c.zone, { en: c.zone_en, ru: c.zone_ru });
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[i18n] Loaded ${cityMap.size} city + ${zoneMap.size} zone translations`,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[i18n] Failed to load cities.json — area names will stay in Hebrew",
      err,
    );
  }
}

/** Translate comma-separated Hebrew area names to target language */
export function translateAreas(areas: string, lang: Language): string {
  if (lang === "he") return areas;
  const key: LangKey = lang;
  return areas
    .split(", ")
    .map((a) => {
      const city = cityMap.get(a);
      if (city?.[key]) return city[key];
      const zone = zoneMap.get(a);
      if (zone?.[key]) return zone[key];
      return a; // fallback: Hebrew as-is
    })
    .join(", ");
}

export function getTemplates(lang: Language): MessageTemplates {
  return templates[lang] ?? templates.ru;
}

export function isValidLanguage(s: string): s is Language {
  return s === "ru" || s === "en" || s === "he";
}
