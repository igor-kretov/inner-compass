/**
 * Conservative, local-only signal for an immediate static safety notice.
 * Keyword matching is necessarily incomplete and is not a risk assessment,
 * diagnosis, or replacement for human/professional support.
 */
const CLEAR_CRISIS_PHRASES = [
  "ich will mich umbringen",
  "ich bringe mich um",
  "ich werde mich umbringen",
  "ich will nicht mehr leben",
  "ich möchte nicht mehr leben",
  "ich will mir das leben nehmen",
  "ich werde mir etwas antun",
  "i want to kill myself",
  "i am going to kill myself",
  "i want to end my life",
] as const;

export const STATIC_CRISIS_MESSAGE =
  "Diese App kann dich in einer akuten Krise nicht ausreichend unterstützen. Wende dich jetzt an eine Person in deiner Nähe, eine medizinische Fachstelle oder den örtlichen Notruf.";

function normalizeForSafetyCheck(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("de-CH")
    .replace(/[.!?,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsClearCrisisPhrase(text: string): boolean {
  const normalized = normalizeForSafetyCheck(text.slice(0, 2_000));
  return CLEAR_CRISIS_PHRASES.some((phrase) => normalized.includes(phrase));
}
