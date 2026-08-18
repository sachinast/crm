// A curated, static set — no external emoji-picker package. Keeps the
// feature dependency-free and the picker instant to open (no data fetch).
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😄", "😂", "🙂", "😉", "😊", "😍", "🤔", "😅", "😴", "😢", "😮", "🙄", "😎", "🥳", "😇"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🙏", "👋", "✌️", "🤝", "💪", "👌", "🤞", "✋"],
  },
  {
    label: "Objects",
    emojis: ["📎", "📌", "📅", "⏰", "✅", "❌", "⚡", "🔥", "💡", "📞", "✈️", "🚗", "🏨", "💳", "📄", "🎉"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍"],
  },
];

// The quick-reply chip presets used to live here as a hardcoded array — now
// admin-editable (app_settings key "messaging.quick_replies") and fetched via
// lib/messaging-api.ts's fetchQuickReplies() / GET /messaging/quick-replies.
