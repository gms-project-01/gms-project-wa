export function toInitCap(s: string): string {
  return s.trim().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}
