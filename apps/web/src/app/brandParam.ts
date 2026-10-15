/**
 * `?brand=berry` tries a hand-made colour ramp for one visit (the style guide, E2E specs).
 * It is read once, before the router starts, and taken out of the address, so links and
 * shared URLs never carry it.
 */
export const initialBrand: string | null = (() => {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get("brand");
  if (value === null) return null;
  url.searchParams.delete("brand");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return value;
})();
