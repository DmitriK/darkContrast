export function clearOverrides(doc: Document) {
  const elems = doc.querySelectorAll('[data-_extension-text-contrast]');

  for (const e of elems) {
    e.removeAttribute('data-_extension-text-contrast');
  }
};
