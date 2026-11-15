// Minimaler Event-Bus.
const handlers = new Map();
export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type).delete(fn);
}
export function emit(type, data) {
  if (sammler) { sammler.push([type, data]); return; }
  handlers.get(type)?.forEach(fn => fn(data));
  handlers.get('*')?.forEach(fn => fn(type, data));
}

// Leise Simulation (Hintergrund-Kolonien): Ereignisse werden gesammelt statt verschickt.
let sammler = null;
/** fn ausführen; alle Ereignisse darin landen in der zurückgegebenen Liste statt bei den Zuhörern. */
export function leise(fn) {
  const alt = sammler;
  const liste = [];
  sammler = liste;
  try { fn(); } finally { sammler = alt; }
  return liste;
}
