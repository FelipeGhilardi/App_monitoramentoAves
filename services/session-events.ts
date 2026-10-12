const listeners = new Set<() => void>();

export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function sessionChanged(): void {
  listeners.forEach((listener) => listener());
}
