import { Identifiable, Identifier } from "./types";

/**
 * Patch in an updated element in a list.
 * @param list list of elements, where elements have an `id` property.
 * @param id identifier to update
 * @param patch updated properties. If null, delete from list.
 */
export function patchInList<T extends Identifiable>(
  list: T[],
  id: Identifier,
  patch?: Partial<T>
): [T[], boolean] {
  for (let i = 0; i < list.length; i += 1) {
    const obj = list[i];
    // If the ID of this element matches the desired ID
    if (obj.id === id) {
      // If the patch is null, delete from the list.
      if (patch === null) {
        return [[...list.slice(0, i), ...list.slice(i + 1)], true];
      }
      const newObj = { ...obj, ...patch };
      return [[...list.slice(0, i), newObj, ...list.slice(i + 1)], true];
    }
  }
  // if no match exists, return the original list.
  return [list, false];
}
