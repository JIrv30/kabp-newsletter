// Every newsletter is an ordered list of blocks stored on the newsletter document.
export const BLOCK_TYPES = {
  heading: { label: "Heading", create: () => ({ text: "" }) },
  text: { label: "Text", create: () => ({ text: "" }) },
  image: { label: "Image", create: () => ({ url: "", alt: "", caption: "" }) },
  button: { label: "Button link", create: () => ({ label: "", url: "", style: "primary" }) },
  event: { label: "Event", create: () => ({ title: "", date: "", start: "", end: "", location: "", details: "" }) },
  callout: { label: "Highlight box", create: () => ({ tone: "info", title: "", text: "" }) },
  video: { label: "Video", create: () => ({ url: "", caption: "" }) },
  divider: { label: "Divider", create: () => ({}) },
};

export const BLOCK_ORDER = ["heading", "text", "image", "button", "event", "callout", "video", "divider"];

export function shortId() {
  const raw = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Math.random()}${Date.now()}`;
  return raw.replace(/[^a-z0-9]/gi, "").slice(0, 10);
}

export function newBlock(type) {
  return { id: shortId(), type, ...BLOCK_TYPES[type].create() };
}

export function stripMarkdown(text = "") {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text, n = 70) {
  return text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text;
}

// A short human name for a block, used in the editor and the analytics
export function blockLabel(block) {
  switch (block.type) {
    case "heading":
      return block.text?.trim() || "Untitled heading";
    case "text":
      return clip(stripMarkdown(block.text)) || "Empty text";
    case "image":
      return block.caption?.trim() || block.alt?.trim() || "Image";
    case "button":
      return block.label?.trim() ? `Button: ${block.label.trim()}` : "Button";
    case "event":
      return block.title?.trim() ? `Event: ${block.title.trim()}` : "Event";
    case "callout":
      return block.title?.trim() || clip(stripMarkdown(block.text)) || "Highlight box";
    case "video":
      return block.caption?.trim() || "Video";
    default:
      return BLOCK_TYPES[block.type]?.label || "Block";
  }
}

export function safeUrl(url = "") {
  const value = String(url).trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/")) return value;
  if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
  return "";
}

export function youTubeId(url = "") {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
