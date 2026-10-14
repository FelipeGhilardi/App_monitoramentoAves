type SightingChangeListener = () => void;

const listeners = new Set<SightingChangeListener>();

export function notifySightingsChanged(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToSightingChanges(listener: SightingChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
