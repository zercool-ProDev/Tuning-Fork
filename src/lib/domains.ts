/**
 * Display metadata for the seven practice domains.
 *
 * The enum itself lives in the schema; this is purely how each one is labelled
 * and coloured. Kept in one place so a domain looks identical on the logger,
 * the session list, the heatmap and every later screen.
 */

export const DOMAINS = [
  { value: "instrument", label: "Instrument", short: "Inst", color: "var(--color-domain-instrument)" },
  { value: "ear_training", label: "Ear Training", short: "Ear", color: "var(--color-domain-ear)" },
  { value: "sight_reading", label: "Sight Reading", short: "Sight", color: "var(--color-domain-sight)" },
  { value: "theory", label: "Music Theory", short: "Theory", color: "var(--color-domain-theory)" },
  { value: "logic_production", label: "Logic Pro", short: "Logic", color: "var(--color-domain-logic)" },
  { value: "genre", label: "Genre Study", short: "Genre", color: "var(--color-domain-genre)" },
  { value: "ep", label: "EP Work", short: "EP", color: "var(--color-domain-ep)" },
] as const;

export type DomainValue = (typeof DOMAINS)[number]["value"];

const BY_VALUE = new Map(DOMAINS.map((domain) => [domain.value, domain]));

export function domainMeta(value: string) {
  return BY_VALUE.get(value as DomainValue) ?? DOMAINS[0];
}

/** Domains where naming a specific instrument makes sense. */
export const INSTRUMENT_DOMAINS: DomainValue[] = ["instrument", "sight_reading"];
