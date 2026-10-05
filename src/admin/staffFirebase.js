import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { app, firebaseConfig } from "../lib/firebase";
import { SITE } from "../config";

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
  ...(SITE.staffEmailDomain ? { hd: SITE.staffEmailDomain } : {}),
});

// Storage is optional (it needs the Blaze plan). Without it, images are added by web address.
export const storage = firebaseConfig.storageBucket ? getStorage(app) : null;

async function decode(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Shrinks photos before upload so pages stay quick on mobile data
async function resize(file, maxWidth = 1600, quality = 0.84) {
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error("That image couldn't be read. Save it as a JPG or PNG and try again.");
  }
  const scale = Math.min(1, maxWidth / source.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image couldn't be prepared."))), "image/jpeg", quality),
  );
}

export async function uploadImage(file, newsletterId) {
  if (!storage) throw new Error("Image upload isn't set up. Paste an image address instead.");
  const blob = await resize(file);
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "image";
  const fileRef = ref(storage, `newsletters/${newsletterId}/${Date.now()}-${base}.jpg`);
  await uploadBytes(fileRef, blob, { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" });
  return getDownloadURL(fileRef);
}
