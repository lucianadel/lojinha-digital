export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

// Normalize display text only; keep the original product content unchanged.
export function descriptionToText(value: string): string {
  return value.replace(/\r\n?/g, "\n")
    .replace(/^\s{0,3}(`{3,}|~{3,})[^\n]*$/gm, "")
    .replace(/^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm, "$1")
    .replace(/^ {0,3}(?:={3,}|-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "")
    .replace(/^([ \t]*)>[ \t]?/gm, "$1")
    .replace(/^([ \t]*)[-+*][ \t]+/gm, "$1• ")
    .replace(/!?\[([^\]\n]*)\]\([^\n)]*\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (_, stars: string, underscores: string) => stars ?? underscores)
    .replace(/(^|[\s(])(?:\*([^*\n]+)\*|_([^_\n]+)_)(?=$|[\s.,!?:;)])/gm, "$1$2$3")
    .replace(/~~([^~\n]+)~~/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1");
}

export function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isValidHotmartUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const trimmed = value.trim();
    return trimmed.length <= 2048 && /^https:\/\/([a-zA-Z0-9-]+\.)*hotmart\.com(\/|$)/.test(trimmed) && !/[\s\\]/.test(trimmed);
  } catch {
    return false;
  }
}
