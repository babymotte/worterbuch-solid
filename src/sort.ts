import { KeyValuePair } from "worterbuch-js";

const reA = /[^a-zA-Z]/g;
const reN = /[^0-9]/g;

export function sortAlphaNumKV(a: KeyValuePair, b: KeyValuePair) {
  return sortAlphaNum(a.key, b.key);
}

export function sortAlphaNum(a: string, b: string) {
  const aA = a.toLowerCase().replace(reA, "");
  const bA = b.toLowerCase().replace(reA, "");
  if (aA === bA) {
    const aN = parseInt(a.replace(reN, ""), 10);
    const bN = parseInt(b.replace(reN, ""), 10);
    return aN === bN ? 0 : aN > bN ? 1 : -1;
  } else {
    return aA > bA ? 1 : -1;
  }
}
