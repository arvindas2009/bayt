/**
 * One member palette for the whole app. Colour is assigned by position in the family, so it is
 * stable for a given household and never depends on anyone's first name. Mid-luminance neons, so
 * they read on both the black and the paper theme; text on them is always var(--on-member).
 */
export const MEMBER_PALETTE = [
  '#B5E61D', // lime
  '#FF4F7B', // pink
  '#A77BFF', // violet
  '#2EC4B6', // cyan
  '#FFC93C', // yellow
  '#FF8A3D', // orange
  '#5B8CFF', // blue
  '#9AA7B8', // slate
] as const

export function memberColorAt(index: number): string {
  return MEMBER_PALETTE[((index % MEMBER_PALETTE.length) + MEMBER_PALETTE.length) % MEMBER_PALETTE.length]
}
