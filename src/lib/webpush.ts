import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    "mailto:admin@absensi-magang.com", // Replace with actual admin email if needed
    publicKey,
    privateKey
  );
} else {
  console.warn("VAPID keys not found. Web Push notifications will not work.");
}

export default webpush;
