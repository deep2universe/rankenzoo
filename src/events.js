// Minimaler Event-Bus.
const handlers = new Map();
export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type).delete(fn);
}
export function emit(type, data) {
  handlers.get(type)?.forEach(fn => fn(data));
  handlers.get('*')?.forEach(fn => fn(type, data));
}
