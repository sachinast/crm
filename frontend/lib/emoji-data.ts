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

export const QUICK_REPLIES = ["👍 Got it", "✅ On it", "🙏 Thanks!", "⏳ One sec"];
