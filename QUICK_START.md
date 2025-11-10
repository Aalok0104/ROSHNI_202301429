#  QUICK START - Civilian Page Testing

## Start Servers (2 terminals needed)

**Terminal 1:**
```powershell
cd frontend
npm run dev
```
→ Opens at http://localhost:5173/

**Terminal 2:**
```powershell
cd frontend
npx json-server --watch db.json --port 3001
```
→ Mock API at http://localhost:3001/

---

## Test Login

**URL:** http://localhost:5173/login

**Test User:**
- Username: `first`
- Password: `password`
- Role: civilian

**Alternative:**
- Username: `sheel`
- Password: `123456`

---

## Quick Test Checklist

1.  Login redirects to `/civilian` page
2.  See blue alert banner at top (changes every 5 seconds)
3.  See big red "EMERGENCY SOS" button
4.  See three columns: Nav | Guidelines | Contacts
5.  Click SOS → form opens
6.  Fill form → submit → success message
7.  See new report in "My Recent Reports"
8.  Visit http://localhost:3001/incidents → see your report

---

## Files Changed

**New:**
- `src/components/EmergencyReportForm.tsx`
- `src/api/civilian.ts`

**Modified:**
- `src/pages/Civilian.tsx` (complete rewrite)
- `src/styles.css` (+600 lines)
- `db.json` (+incidents)

---

## Commit Commands

```powershell
git status
git add .
git commit -m "feat: Complete Civilian emergency response page"
git push origin civilian-page
```

Then create PR on GitHub!

---

## Emergency Numbers Displayed

- 112 (National Emergency)
- 100 (Police)
- 101 (Fire)
- 102 (Ambulance)
- 1070 (Disaster)

---

## Colors Used

- Primary Blue: #0066cc
- Emergency Red: #dc2626
- Background: #f0f4f8
- Text: #1a1a1a

---

**Need help? Check CIVILIAN_PAGE_GUIDE.md for detailed instructions!**
