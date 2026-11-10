/**
 * Typed wrapper around document.getElementById for elements a page requires.
 * Throws a descriptive error (instead of a later "cannot read properties of
 * null") if the element is missing from the HTML.
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}