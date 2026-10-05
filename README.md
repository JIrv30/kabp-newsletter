# KABP parent newsletter

A Smore-style newsletter site for Kings Academy Brune Park, built with React, Firebase and Tailwind CSS.

- **Parents** open a newsletter from a link (email, text, school app, Facebook). It is designed for phones first, in the school colours.
- **Staff** sign in with Google at `/admin`, build each issue from blocks (headings, text, images, events with "Add to calendar", buttons, highlight boxes, YouTube videos), preview it at phone size, then publish.
- **Statistics** for each issue: views, unique readers, reading time, how far people scrolled, which sections were seen, link clicks, reactions, when people read, devices and where readers came from. Everything downloads as CSV for Google Sheets.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and create a project (Google Analytics is not needed).
2. **Build > Firestore Database > Create database.** Choose production mode and the `europe-west2 (London)` location so data stays in the UK.
3. **Build > Authentication > Get started > Google**, switch it on and save.
4. **Project settings > Your apps > Web (</>)**, register an app, and keep the config values it shows.

## 2. Run it on your computer

```bash
npm install
cp .env.example .env.local     # then paste the config values into .env.local
npm run dev
```

Open http://localhost:5173 for the parent view and http://localhost:5173/admin for staff.

Put the school crest at `public/logo.png` (a square PNG works best).

## 3. Give staff access

Staff sign in with Google, but only addresses on the admins list get in:

1. Firestore > **Start collection** > Collection ID `admins`.
2. Document ID: the staff member's email address **in lower case**, e.g. `j.irving@yourschool.org`.
3. Add any field (for example `name: James Irving`) and save.

Repeat for each member of staff. Remove the document to remove access.

## 4. Publish the site

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project; this updates .firebaserc
npm run deploy                # builds, then deploys hosting, security rules and the index
```

Your site will be at `https://<project-id>.web.app`. To use a school subdomain such as `news.yourschool.org`, use Hosting > Add custom domain, then add that domain under Authentication > Settings > Authorised domains.

The first deploy creates a Firestore index for the newsletters list. It can take a few minutes to build; until it has, the parent home page shows an error.

## 5. Optional: uploading images

Without this, staff add images by pasting a web address (for example from the school website or Google Drive's "anyone with the link" images).

Cloud Storage now needs the pay-as-you-go **Blaze** plan. A school newsletter will sit comfortably inside the free allowance, but a payment card is needed on the account. Setting a budget alert in Google Cloud is sensible.

1. Upgrade to Blaze, then **Build > Storage > Get started**.
2. Copy the bucket name (e.g. `your-project.firebasestorage.app`) into `VITE_FIREBASE_STORAGE_BUCKET` in `.env.local`.
3. `npm run deploy:storage` and then `npm run deploy`.

Photos are resized to 1600px wide in the browser before upload, so phones aren't downloading 8MB camera images.

## 6. Sending a newsletter

After publishing, the editor shows a **Share links** panel with one link per channel (email, text, school app, website, Facebook). Use the matching link in each place so the statistics can show which channel works best. Add or rename channels in `src/config.js`.

Use **Open the live page** in the editor to check the published version: visits through that link are not counted.

## How reading is measured

Each visit creates one anonymous document at `newsletters/{id}/sessions/{random id}`:

| Field | Meaning |
| --- | --- |
| `visitorId` | Random id kept on the reader's device, used to count unique readers |
| `activeSeconds` | Time the page was on screen with the reader active (pauses after 45 seconds of no scrolling or tapping) |
| `maxScroll` | Furthest point reached, as a percentage of the page. 90% or more counts as "read to the end" |
| `blocksSeen` | Sections that were at least half on screen for about a second |
| `clicks` | Links, buttons and "Add to calendar" presses |
| `reaction` | The emoji reaction chosen, if any |
| `source`, `device` | Share link used, and phone, tablet or computer |

No names, email addresses or IP addresses are stored. Readers can switch counting off from the newsletter footer.

Writes are batched (one when the page opens, then at most one every 20 seconds while someone is reading, plus one when they leave), so a typical visit costs 2 to 6 writes.

### Data protection

Even anonymous, device-based measurement should be covered by your privacy notice, and the device id is stored in the reader's browser. Run this past the trust's Data Protection Officer before launch.

To delete old reading data automatically after `retentionDays` (365 by default, set in `src/config.js`), create a **TTL policy** in the Google Cloud console: Firestore > Time-to-live > Create policy, collection group `sessions`, timestamp field `expireAt`.

## Costs on the free (Spark) plan

The free plan allows 50,000 reads and 20,000 writes a day. As a rough guide, 1,000 visits to an issue use about 5,000 writes spread over several days. Opening an issue's statistics page reads one document per visit, so 1,000 visits means 1,000 reads each time. The dashboard uses server-side counts, which cost one read per 1,000 visits.

## Changing things

| To change | Edit |
| --- | --- |
| School name, newsletter name, values line, footer link, share channels, reactions, retention | `src/config.js` |
| Brand colours and fonts | the `@theme` block in `src/index.css` |
| Reaction ids (if you change them) | `src/config.js` **and** the list in `firestore.rules`, then redeploy |
| Block types | `src/lib/blocks.js` (data), `src/components/Blocks.jsx` (parent view), `src/admin/components/BlockForm.jsx` (editor) |

## Project layout

```
src/
  config.js                  school settings
  lib/                       Firebase setup, block definitions, reading tracker, formatting
  components/                parent-facing newsletter view, masthead, blocks
  pages/                     parent pages: newsletter list, single newsletter
  admin/                     staff area (loaded separately so parents never download it)
    pages/                   dashboard, editor, statistics, sign in
    analytics.js             turns visit records into the statistics
firestore.rules              who can read and write what
storage.rules                image upload rules
```

## Known limits

- When a newsletter link is shared on Facebook or WhatsApp, the preview card shows the school name rather than that issue's title, because the page is built in the browser. A small Cloud Function could add per-issue previews later.
- Reading time and scroll depth are sent when the reader leaves or switches app. On some phones the very last update is lost if the browser is closed abruptly, so figures slightly undercount.
