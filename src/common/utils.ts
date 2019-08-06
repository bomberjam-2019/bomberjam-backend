export function replaceCharAt(text: string, idx: number, newChar: string): string {
  return text.substr(0, idx) + newChar + text.substr(idx + 1);
}

export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
