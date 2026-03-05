# EasyOref

התרעות פיקוד העורף → צ׳אט המשפחה בטלגרם.

[English](../README.md) · [Русский](readme_ru.md)

> [!CAUTION]
> EasyOref **אינו מחליף** את ערוצי ההתרעה הרשמיים של פיקוד העורף.
> הבוט **משלים** אותם — מעדכן את הקרובים שלכם בחו״ל.
> תמיד פעלו לפי הנחיות פיקוד העורף!

---

## למה

בזמן מתקפת טילים, הקרובים שלכם בחו״ל רואים בחדשות «טילים על נתניה».

הם לא יודעים:
- זה השכונה שלכם או 200 ק״מ משם?
- אתם בטוחים?
- יש סיבה לדאגה?

**אין פתרון קיים.**
אפליקציות אזעקה עם סינון לפי אזור — בשבילכם בישראל.
התרעות Cell Broadcast — בשבילכם בישראל.

---

## יכולות

- **4 שפות** — רוסית, אנגלית, עברית, ערבית
- **3 סוגי אזעקה** — התרעה מוקדמת, צפירה, ירידה ממרחב מוגן
- **הודעות מותאמות** — טקסט ומדיה משלכם לכל סוג אזעקה

---

## התחלה מהירה

**צריך:** Node.js 22+, Docker, מכונה שעובדת כל הזמן ([RPi](rpi.md), שרת, או [מקומי](local.md)).

### שלב 1: בוט בטלגרם

1. שלחו הודעה ל-[@BotFather](https://t.me/BotFather) → `/newbot` → העתיקו את הטוקן
2. הוסיפו את הבוט לצ׳אט הקבוצתי
3. העבירו הודעה מהצ׳אט ל-[@userinfobot](https://t.me/userinfobot) → העתיקו את ה-chat ID

### שלב 2: מצאו את ID העיר

פתחו את [cities.json](https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json), חפשו את העיר, העתיקו את המספר מ-`id`.

דוגמה: `"id": 722` = תל אביב — דרום ויפו.

### שלב 3: הפעלה

על מכונה שעובדת כל הזמן (Mac / Linux / RPi):

```bash
npm install -g easyoref
```

צרו `config.yaml` בתיקייה כלשהי:

```yaml
city_ids:
  - 722          # ID של העיר שלכם

language: he     # ru / en / he / ar

telegram:
  bot_token: "הדביקו-טוקן-כאן"
  chat_id: "-1001234567890"
```

הריצו:

```bash
easyoref
```

או דרך Docker:

```bash
git clone https://github.com/mikhailkogan17/easyoref.git && cd easyoref
cp config.yaml.example config.yaml   # ערכו
docker compose up -d
```

**זהו.** הבוט ישלח הודעות לצ׳אט בכל התרעה של פיקוד העורף באזור שלכם.

---

## הגדרות

כל ההגדרות ב-`config.yaml`.

### חובה

| מפתח                 | תיאור                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `city_ids`           | ערים לניטור ([מצאו ID](https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json)) |
| `telegram.bot_token` | טוקן מ-@BotFather                                                                                       |
| `telegram.chat_id`   | ID של הצ׳אט (מספר שלילי)                                                                                |

### אופציונלי

| מפתח                              | ברירת מחדל | תיאור                                        |
| --------------------------------- | ---------- | -------------------------------------------- |
| `language`                        | `ru`       | שפה: `ru` `en` `he` `ar`                     |
| `alert_types`                     | הכל        | סוגי אזעקה: `early` `siren` `incident_over`  |
| `gif_mode`                        | `none`     | GIF: `funny_cats` `assertive` `none`         |
| `title_override.*`                | —          | כותרת מותאמת לכל סוג אזעקה                   |
| `description_override.*`          | —          | תיאור מותאם לכל סוג אזעקה                    |
| `observability.betterstack_token` | —          | לוגים דרך [Better Stack](MONITORING.md)      |

---

## רישיון

[MIT](../LICENSE) — מיכאיל קוגן, 2025–2026
