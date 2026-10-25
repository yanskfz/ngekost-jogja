# Funnel metrics (preview)

Six anonymous events; no cookies, user ids, IPs, listing ids, or message contents are recorded.

| Event | Fired by | Meaning |
| --- | --- | --- |
| `consent_shown` | client, when the consent modal appears | A visitor met the safety gate. |
| `consent_accepted` | server action, after the checkbox is verified | Consent completed. |
| `consent_abandoned` | client, on page hide while the modal is still unconfirmed | Visitor left without consenting. |
| `gate_shown` | client, when the locked-listing gate renders | An anonymous visitor reached the 3-of-5 limit. |
| `signup_started` | client, when the sign-in page opens | Visitor chose to unlock. |
| `signup_completed` | server action | Visitor unlocked all five (demo sign-in in the preview). |

Consent events may carry a coarse `viewport` bucket (`sm` under 640 px, `md` under 1024 px, `lg`).

Definitions:

- consent completion = `consent_accepted` / `consent_shown`
- consent abandonment = `consent_abandoned` / `consent_shown`
- sign-up conversion = `signup_completed` / `gate_shown`

Transport and limits: the client sends `POST /api/events` (allowlisted names, 200-byte body limit) with `sendBeacon`, skipped when Do Not Track or Global Privacy Control is on. The server writes one JSON line to stdout (`{"type":"nk_event",...}`), which Vercel keeps in its logs. There is no database, no deduplication, and counts are not durable, so these are indicative numbers for the preview, not a launch baseline. A production analytics sink, retention, and consent for analytics are open decisions.
