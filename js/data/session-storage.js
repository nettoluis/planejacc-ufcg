const STORAGE_KEY = 'planejacc-ufcg:session:v1';

// Reads the whole persisted session blob (course overrides, added periods,
// registered activities). Never throws — a corrupt value or unavailable
// storage (private browsing, disabled) just means nothing to restore.
export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Merges `partial` into whatever's already stored, so the courses
// composable and the activities composable can each save their own slice
// without clobbering the other's.
export function saveSession(partial) {
  try {
    const current = loadSession() || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
    // Storage unavailable or full — nothing to persist to, fail silently.
  }
}
