# שידוך POC

אתר POC לשידוך עובדים/מעסיקים **בלי חיפוש**.

## מה יש

- כניסה עם Google (Auth.js) + דמו בלי Google
- צ׳אט AI מתוחכם לעובד ולמעסיק
- כרטיסים מפורטים מראש (עשרות שדות)
- דירוג התאמות + גמישות 1–10
- שמירה ב־Supabase Postgres
- מעסיק: מאשר / דוחה / שאלת תחום
- עובד: רק משרות שאושרו עבורו

## הגדרת סביבה

```bash
cp .env.example .env.local
```

ראו `.env.example` עבור:
- `GOOGLE_GENERATIVE_AI_API_KEY` (אופציונלי)
- `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `DATABASE_URL` (Supabase)

Google OAuth redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR-DOMAIN/api/auth/callback/google`

## הרצה

```bash
npm install
npm run dev
```

## בדיקות

```bash
npm test
```
