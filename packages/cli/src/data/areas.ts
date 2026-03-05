/**
 * Oref area names for CLI checkbox selection.
 * Hebrew value is what goes into AREAS env var.
 */

export interface AreaChoice {
  name: string;
  value: string;
}

/** Grouped area choices for the interactive wizard */
export const AREA_CHOICES: AreaChoice[] = [
  // ── Tel Aviv / Gush Dan ─────────────────────────
  {
    name: "Tel Aviv - South & Jaffa (תל אביב - דרום העיר ויפו)",
    value: "תל אביב - דרום העיר ויפו",
  },
  {
    name: "Tel Aviv - City Center (תל אביב - מרכז העיר)",
    value: "תל אביב - מרכז העיר",
  },
  {
    name: "Tel Aviv - North (תל אביב - עבר הירקון)",
    value: "תל אביב - עבר הירקון",
  },
  { name: "Gush Dan region (גוש דן)", value: "גוש דן" },
  {
    name: "Ramat Gan - Givatayim (רמת גן - גבעתיים)",
    value: "רמת גן - גבעתיים",
  },
  { name: "Bnei Brak (בני ברק)", value: "בני ברק" },
  { name: "Petah Tikva (פתח תקווה)", value: "פתח תקווה" },
  { name: "Holon (חולון)", value: "חולון" },
  { name: "Bat Yam (בת ים)", value: "בת ים" },

  // ── Sharon ──────────────────────────────────────
  { name: "Herzliya (הרצליה)", value: "הרצליה" },
  { name: "Netanya (נתניה)", value: "נתניה" },
  { name: "Kfar Saba (כפר סבא)", value: "כפר סבא" },
  { name: "Ra'anana (רעננה)", value: "רעננה" },
  { name: "Hod HaSharon (הוד השרון)", value: "הוד השרון" },

  // ── Center ──────────────────────────────────────
  {
    name: "Rishon LeZion - East (ראשון לציון - מזרח)",
    value: "ראשון לציון - מזרח",
  },
  {
    name: "Rishon LeZion - West (ראשון לציון - מערב)",
    value: "ראשון לציון - מערב",
  },
  { name: "Rehovot (רחובות)", value: "רחובות" },
  { name: "Ness Ziona (נס ציונה)", value: "נס ציונה" },
  { name: "Lod (לוד)", value: "לוד" },
  { name: "Ramla (רמלה)", value: "רמלה" },
  { name: "Modi'in (מודיעין - מכבים - רעות)", value: "מודיעין - מכבים - רעות" },

  // ── Jerusalem ───────────────────────────────────
  { name: "Jerusalem - Center (ירושלים - מרכז)", value: "ירושלים - מרכז" },
  { name: "Jerusalem - East (ירושלים - מזרח)", value: "ירושלים - מזרח" },
  { name: "Jerusalem - South (ירושלים - דרום)", value: "ירושלים - דרום" },
  { name: "Jerusalem - West (ירושלים - מערב)", value: "ירושלים - מערב" },

  // ── Haifa ───────────────────────────────────────
  {
    name: "Haifa - Carmel & Downtown (חיפה - כרמל ועיר תחתית)",
    value: "חיפה - כרמל ועיר תחתית",
  },
  { name: "Haifa - West (חיפה - מערב)", value: "חיפה - מערב" },
  {
    name: "Haifa - Neve Sha'anan (חיפה - נווה שאנן)",
    value: "חיפה - נווה שאנן",
  },

  // ── South ───────────────────────────────────────
  { name: "Ashdod A,B,D,E (אשדוד - א,ב,ד,ה)", value: "אשדוד - א,ב,ד,ה" },
  { name: "Ashkelon - North (אשקלון - צפון)", value: "אשקלון - צפון" },
  { name: "Ashkelon - South (אשקלון - דרום)", value: "אשקלון - דרום" },
  { name: "Beer Sheva - East (באר שבע - מזרח)", value: "באר שבע - מזרח" },
  { name: "Beer Sheva - West (באר שבע - מערב)", value: "באר שבע - מערב" },
  { name: "Sderot (שדרות)", value: "שדרות" },
  { name: "Gaza Envelope (עוטף עזה)", value: "עוטף עזה" },
  { name: "Eilat (אילת)", value: "אילת" },

  // ── North ───────────────────────────────────────
  { name: "Nazareth (נצרת)", value: "נצרת" },
  { name: "Akko / Acre (עכו)", value: "עכו" },
  { name: "Tiberias (טבריה)", value: "טבריה" },
  { name: "Safed / Tzfat (צפת)", value: "צפת" },
  { name: "Kiryat Shmona (קריית שמונה)", value: "קריית שמונה" },

  // ── Regions ─────────────────────────────────────
  { name: "Sharon region (שרון)", value: "שרון" },
  { name: "Shfela / Lowlands (שפלה)", value: "שפלה" },
  { name: "Negev (נגב)", value: "נגב" },
  { name: "Upper Galilee (גליל עליון)", value: "גליל עליון" },
  { name: "Lower Galilee (גליל תחתון)", value: "גליל תחתון" },
  { name: "Golan Heights (גולן)", value: "גולן" },
  { name: "Jezreel Valley (עמק יזרעאל)", value: "עמק יזרעאל" },
  { name: "Jordan Valley (בקעת הירדן)", value: "בקעת הירדן" },
];
