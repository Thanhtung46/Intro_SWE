/** Must stay in sync with schema_matchmaking.fold_search_text. */
export function foldSearchText(value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
