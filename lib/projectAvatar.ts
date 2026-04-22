/**
 * Deterministic fun avatar for a project.
 * Returns a consistent emoji + background color based on the project id.
 * No network needed — pure hash.
 */

const EMOJIS = ['🏗', '🏢', '🏠', '🏭', '🔨', '🛠', '⚙️', '🔩', '🏗', '🚧', '🏛', '📐', '🏚', '🔧', '🪚', '⛏', '🏗', '🧱', '🪜', '🔑'];

const COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#009688', '#3F51B5', '#FF5722', '#607D8B', '#795548',
  '#E91E63', '#00BCD4', '#8BC34A', '#FFC107', '#673AB7',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function projectAvatar(id: string): { emoji: string; color: string } {
  const h = hashStr(id);
  return {
    emoji: EMOJIS[h % EMOJIS.length],
    color: COLORS[h % COLORS.length],
  };
}
