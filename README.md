# Locket

A Locket clone built with Next.js. Send photos to your closest friends, see
theirs in a quiet feed, and react with emojis — mobile first, no noise.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything works out of the box: accounts, friends,
photos and reactions are stored locally in SQLite (`./.data/locket.db`) and
uploaded photos live in `./.data/uploads`. `npm run build && npm start` serves
the production build.

To try it with a friend, open the app on two devices on the same network (or
two browsers), create two accounts, and add each other by username.

## What's inside

- **Phone login** — like Locket itself: enter a number, get a 6-digit code,
  and you are signed in (a new number creates the account after you pick a
  name and @username). Codes are single use, expire in 10 minutes and are
  rate limited. Real SMS goes out through Twilio when it is configured;
  otherwise the code is shown on screen so the app works without an SMS
  gateway.
- **Auth** — email + password accounts also work, with hashed passwords and
  httpOnly session cookies. Usernames are unique and used to find friends.
- **Camera** — real camera stream (`getUserMedia`) with front/rear switching,
  3:4 capture, preview, retake and send. If no camera is available, photos can
  be picked from the library instead.
- **Feed** — photos from you and your friends, with Locket's time badge and
  emoji reactions that notify the sender.
- **Friends** — search by username, friend requests, invite links (`/u/username`),
  a 20-friend limit and removing friends.
- **Notifications** — friend requests and reactions on your Lockets, with an
  unread badge.
- **History** — every Locket you sent, grouped by day, in a full-screen viewer.

## Configuration

Copy `.env.example` to `.env.local` if you want to change anything:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOCKET_DATA_DIR` | `./.data` | Where the database and photos are stored |
| `COOKIE_SECURE` | `false` | Set to `true` when serving over https |
| `TWILIO_ACCOUNT_SID` | — | Twilio account for real login texts |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_FROM_NUMBER` | — | Twilio sender, e.g. `+12025550123` |
| `OTP_SECRET` | `locket-local` | Extra secret mixed into hashed codes |

Phone codes are hashed at rest, valid for 10 minutes, limited to 5 tries and
5 texts per number per hour with a 45 second resend cooldown. Without Twilio
credentials the code is displayed on the verification screen.

## Notes

- The database is created automatically on first request. Deleting `.data`
  resets the app.
- Photos are served through `/api/media/[file]` with immutable caching.
- The UI is in English to match Locket's own copy.
- Live camera streaming (`getUserMedia`) requires `localhost` or https. When the
  app is opened from a phone over plain http on your LAN, the camera screen
  falls back to the phone's native camera and photo library, so sending a
  Locket still works.
