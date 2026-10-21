export const SEED_ANCHOR_KEY = 'seedAnchor'

/** Seeded rows use these id prefixes; user-created rows use cuids. Refresh only touches seeded rows. */
export const SEED_PREFIX = { event: 'evt_', obligation: 'obl_', memory: 'memo_' } as const
