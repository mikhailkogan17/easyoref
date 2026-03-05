/**
 * EasyOref — Internationalization (i18n)
 *
 * Supported languages: Russian (ru), English (en), Hebrew (he), Arabic (ar)
 * Default: ru (built for diaspora families)
 *
 * Message format:
 *   <b>🚀 Title</b>
 *   Description
 *   <blockquote>
 *   <b>Key:</b> Value
 *   ...
 *   </blockquote>
 */

export type Language = "ru" | "en" | "he" | "ar";

export interface MessageTemplates {
  earlyWarning: (areas: string, time: string) => string;
  siren: (areas: string, time: string) => string;
  resolved: (areas: string) => string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Message Templates — HTML with blockquote
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ru: MessageTemplates = {
  earlyWarning: (areas, time) =>
    [
      "<b>🚀 Раннее предупреждение</b>",
      "Зафиксированы запуски ракет. Находитесь рядом с защищённым помещением.",
      "",
      "<blockquote>",
      `<b>Район:</b> ${areas}`,
      `<b>Подлётное время:</b> ~5–12 мин`,
      `<b>Время:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>🚨 Сирена</b>",
      "Войдите в защищённое помещение.",
      "",
      "<blockquote>",
      `<b>Район:</b> ${areas}`,
      `<b>Подлётное время:</b> ~1.5 мин`,
      `<b>Время:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>😮‍💨 Инцидент завершён</b>",
      "Можно покинуть защищённое помещение.",
      "",
      "<blockquote>",
      `<b>Район:</b> ${areas}`,
      "</blockquote>",
    ].join("\n"),
};

const en: MessageTemplates = {
  earlyWarning: (areas, time) =>
    [
      "<b>🚀 Early Warning</b>",
      "Rocket launches detected. Stay near a protected space.",
      "",
      "<blockquote>",
      `<b>Area:</b> ${areas}`,
      `<b>Time to impact:</b> ~5–12 min`,
      `<b>Time:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>🚨 Siren Alert</b>",
      "Enter a protected space immediately.",
      "",
      "<blockquote>",
      `<b>Area:</b> ${areas}`,
      `<b>Time to impact:</b> ~1.5 min`,
      `<b>Time:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>😮‍💨 Incident Over</b>",
      "You may leave the protected space.",
      "",
      "<blockquote>",
      `<b>Area:</b> ${areas}`,
      "</blockquote>",
    ].join("\n"),
};

const he: MessageTemplates = {
  earlyWarning: (areas, time) =>
    [
      "<b>🚀 התרעה מוקדמת</b>",
      "זוהו שיגורים. הישארו בקרבת מרחב מוגן.",
      "",
      "<blockquote>",
      `<b>אזור:</b> ${areas}`,
      `<b>זמן מעוף:</b> ~5–12 דקות`,
      `<b>שעה:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>🚨 צבע אדום</b>",
      "היכנסו למרחב מוגן.",
      "",
      "<blockquote>",
      `<b>אזור:</b> ${areas}`,
      `<b>זמן מעוף:</b> ~1.5 דקות`,
      `<b>שעה:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>😮‍💨 האירוע הסתיים</b>",
      "ניתן לצאת מהמרחב המוגן.",
      "",
      "<blockquote>",
      `<b>אזור:</b> ${areas}`,
      "</blockquote>",
    ].join("\n"),
};

const ar: MessageTemplates = {
  earlyWarning: (areas, time) =>
    [
      "<b>🚀 إنذار مبكر</b>",
      "تم رصد إطلاق صواريخ. ابقوا بالقرب من الملجأ.",
      "",
      "<blockquote>",
      `<b>المنطقة:</b> ${areas}`,
      `<b>وقت الوصول:</b> ~5–12 دقيقة`,
      `<b>الوقت:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  siren: (areas, time) =>
    [
      "<b>🚨 صفارة إنذار</b>",
      "ادخلوا إلى الملجأ فوراً.",
      "",
      "<blockquote>",
      `<b>المنطقة:</b> ${areas}`,
      `<b>وقت الوصول:</b> ~1.5 دقيقة`,
      `<b>الوقت:</b> ${time}`,
      "</blockquote>",
    ].join("\n"),

  resolved: (areas) =>
    [
      "<b>😮‍💨 انتهى الحادث</b>",
      "يمكنكم مغادرة الملجأ.",
      "",
      "<blockquote>",
      `<b>المنطقة:</b> ${areas}`,
      "</blockquote>",
    ].join("\n"),
};

const templates: Record<Language, MessageTemplates> = { ru, en, he, ar };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Area Name Translation — loaded from pikud-haoref-api/cities.json
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CITIES_JSON_URL =
  "https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json";

interface CityEntry {
  id: number;
  name: string;
  name_en: string;
  name_ru: string;
  name_ar: string;
  zone: string;
  zone_en: string;
  zone_ru: string;
  zone_ar: string;
}

type LangKey = "en" | "ru" | "ar";

/** Hebrew city name → { en, ru, ar } */
const cityMap = new Map<string, Record<LangKey, string>>();
/** Hebrew zone name → { en, ru, ar } */
const zoneMap = new Map<string, Record<LangKey, string>>();
/** City ID → Hebrew name (for YAML city_ids resolution) */
const idToNameMap = new Map<number, string>();

/**
 * Known bad translations in upstream cities.json.
 * Applied as post-processing corrections after loading.
 * Key: Hebrew name, Value: { lang: corrected_name }
 */
const TRANSLATION_FIXES: Record<string, Partial<Record<LangKey, string>>> = {
  "תל אביב - דרום העיר ויפו": {
    ru: "Тель-Авив — Южный район и Яффо",
  },
};

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
      cityMap.set(c.name, { en: c.name_en, ru: c.name_ru, ar: c.name_ar });
      if (c.id) idToNameMap.set(c.id, c.name);
      if (c.zone && !zoneMap.has(c.zone)) {
        zoneMap.set(c.zone, { en: c.zone_en, ru: c.zone_ru, ar: c.zone_ar });
      }
    }

    // Apply known corrections over upstream data
    for (const [heName, fixes] of Object.entries(TRANSLATION_FIXES)) {
      const existing = cityMap.get(heName);
      if (existing) {
        for (const [lang, corrected] of Object.entries(fixes)) {
          existing[lang as LangKey] = corrected!;
        }
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

/**
 * Resolve numeric city IDs to Hebrew area names.
 * Call AFTER initTranslations().
 * Unknown IDs are logged as warnings and skipped.
 */
export function resolveCityIds(ids: number[]): string[] {
  const names: string[] = [];
  for (const id of ids) {
    const name = idToNameMap.get(id);
    if (name) {
      names.push(name);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] Unknown city ID: ${id} — skipping`);
    }
  }
  return names;
}

export function getTemplates(lang: Language): MessageTemplates {
  return templates[lang] ?? templates.ru;
}

export function isValidLanguage(s: string): s is Language {
  return s === "ru" || s === "en" || s === "he" || s === "ar";
}
