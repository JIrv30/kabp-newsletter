// School-wide settings. Change these to suit; nothing else needs editing for the basics.
export const SITE = {
  schoolName: "Kings Academy Brune Park",
  newsletterName: "Parent newsletter",
  values: "Honesty, faith and courage",

  // Put the crest at public/logo.png (a square PNG works best). If it's missing the site still works.
  logoSrc: "/logo.png",

  // Optional link in the footer, e.g. "https://www.your-school-site.org"
  schoolWebsite: "",

  // Optional: your staff Google Workspace domain (e.g. "yourtrust.org").
  // It only tidies the Google account picker; the admins list in Firestore is what grants access.
  staffEmailDomain: "",

  // How long anonymous reading data is kept before Firestore deletes it (needs the TTL policy, see README)
  retentionDays: 365,

  // Each channel gets its own tracked link on the editor's share panel, so you can see where readers came from
  shareChannels: [
    { id: "email", label: "Email" },
    { id: "text", label: "Text message" },
    { id: "app", label: "School app" },
    { id: "website", label: "School website" },
    { id: "facebook", label: "Facebook" },
  ],

  // If you change these ids, update the matching list in firestore.rules too
  reactions: [
    { id: "thanks", emoji: "👍", label: "Useful" },
    { id: "love", emoji: "❤️", label: "Love it" },
    { id: "celebrate", emoji: "👏", label: "Great news" },
  ],
};
