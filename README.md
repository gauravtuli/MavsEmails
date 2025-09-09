# Bulk Gmail Sender (No OAuth)

This app sends personalized bulk emails via **Gmail SMTP with an App Password**. No OAuth needed.

## Contacts File Format
- File: `.xlsx` or `.csv`
- Must include an **Email** column (case-insensitive). Other columns can be used in templates.

Example CSV:

```
Email,FirstName,Company
jane@example.com,Jane,Acme Inc
john@example.com,John,Globex
```

Use `{{FirstName}}` and `{{Company}}` in Subject/Body.

## Gmail App Password (Required)
1. Go to **Google Account → Security**.
2. Enable **2‑Step Verification** (if not already).
3. Open **App passwords**.
4. App: **Mail**, Device: **Other** (name it e.g. "Bulk Sender").
5. Copy the 16‑character password (no spaces) and paste into the app.

> Google may block sign‑ins if your account has unusual activity. Keep sends modest; warm up gradually.

## Limits & Best Practices
- Typical daily send limits: Personal ~**500/day**. Workspace often **2,000/day** (depends on admin).
- Throttle at **≥1000ms** between emails to reduce blocking.
- Keep content non‑spammy. Use valid **Reply‑To** and **From name**.
- Consider **Dry run** first to validate preview.

## Security
- Credentials are only used in‑memory to relay SMTP and are **not persisted**.
- Do **not** paste credentials into chat, logs, or issue trackers.

## Local Dev
```bash
pnpm install
pnpm dev
```
Open http://localhost:3000

## Deploy
- Vercel GitHub Import or `vercel --prod` (no env needed).