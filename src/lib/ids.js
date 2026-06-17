// ID generation utilities (ported from the monolith).

// UUID for local records (matches Supabase uuid columns).
export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// Short, unguessable id for public share links (no ambiguous characters).
export function publicId() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join('');
}
