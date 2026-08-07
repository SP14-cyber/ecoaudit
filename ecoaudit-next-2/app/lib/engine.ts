// EcoAudit's reasoning engine — runs entirely in the browser, no API calls,
// no cost. Grounded in two real, named frameworks:
//   - FTC Green Guides: which environmental terms are legally substantiable
//     and which have no enforceable definition.
//   - TerraChoice/UL's "Seven Sins of Greenwashing" taxonomy.
// This is a heuristic/keyword engine, not a language model: it's transparent,
// auditable, and free to run at unlimited scale, at the cost of nuance a full
// LLM read would catch (sarcasm, unusual phrasing, novel claims it doesn't
// recognize). The architecture is written so a live Claude call could later
// slot in as a drop-in upgrade behind the same analyze() interface.

export type Sin =
  | "Vagueness"
  | "No Proof"
  | "Hidden Trade-off"
  | "Worshipping False Labels"
  | "Irrelevance";

export interface FlaggedTerm {
  term: string;
  sin: Sin;
  explanation: string;
}

export interface Certification {
  term: string;
  note: string;
}

export interface AuditResult {
  grade: string;
  role: "success" | "warning" | "danger";
  risk: "Low" | "Medium" | "High";
  score: number;
  flagged: FlaggedTerm[];
  certifications: Certification[];
  summaryLines: string[];
  alternative?: string;
}

const VAGUE_TERMS: { pattern: RegExp; sin: Sin; explanation: string }[] = [
  {
    pattern: /\b(eco-?friendly|planet-?friendly|earth-?friendly)\b/i,
    sin: "Vagueness",
    explanation:
      'has no legal definition under the FTC Green Guides — any product can carry it regardless of actual impact.',
  },
  {
    pattern: /\b(all[- ]natural|100%\s*natural|natural)\b/i,
    sin: "Vagueness",
    explanation:
      '"natural" is unregulated — arsenic and crude oil are natural too. It says nothing about environmental impact.',
  },
  {
    pattern: /\b(sustainable|sustainability)\b/i,
    sin: "Vagueness",
    explanation:
      "is one of the most overused unregulated terms in marketing — it names a goal, not a verified outcome.",
  },
  {
    pattern: /\b(clean|conscious|eco-?conscious)\b/i,
    sin: "Vagueness",
    explanation:
      "is a feel-good label with no measurable standard behind it.",
  },
  {
    pattern: /\bguilt-?free\b/i,
    sin: "Irrelevance",
    explanation:
      "is an emotional appeal, not an environmental claim — it distracts from whether the product is actually low-impact.",
  },
  {
    pattern: /\bbiodegradable\b/i,
    sin: "Hidden Trade-off",
    explanation:
      "is often true only under industrial composting conditions most consumers don't have access to — check for a specific timeframe and environment.",
  },
  {
    pattern: /\bnon-?toxic\b/i,
    sin: "No Proof",
    explanation:
      "is rarely backed by a named testing standard or third party — ask which body verified it.",
  },
  {
    pattern: /\brecyclable\b/i,
    sin: "Hidden Trade-off",
    explanation:
      "is frequently true in theory but not in most municipal facilities — the EPA estimates most \"recyclable\" plastic packaging isn't actually processed as such in practice.",
  },
  {
    pattern: /\bcarbon[- ]neutral\b/i,
    sin: "Hidden Trade-off",
    explanation:
      "often relies on purchased offsets rather than actual emissions reduction — worth asking whether this is offset-based or a real cut.",
  },
  {
    pattern: /\bzero[- ]waste\b/i,
    sin: "No Proof",
    explanation:
      "is a strong claim rarely accompanied by a lifecycle audit proving it.",
  },
  {
    pattern: /\bcruelty-?free\b/i,
    sin: "Vagueness",
    explanation:
      "has no single enforced legal standard in the US and can vary by which ingredients or supply-chain stages it actually covers.",
  },
];

const CERTIFICATIONS: { pattern: RegExp; term: string; note: string }[] = [
  {
    pattern: /\bb[- ]?corp\b|certified b corporation/i,
    term: "B Corp",
    note: "an independently audited certification covering environmental and social performance.",
  },
  {
    pattern: /\bfair\s*trade\s*certified\b/i,
    term: "Fair Trade Certified",
    note: "a third-party verified labor and sourcing standard.",
  },
  {
    pattern: /\busda\s*organic\b/i,
    term: "USDA Organic",
    note: "a legally regulated US government certification.",
  },
  {
    pattern: /\benergy\s*star\b/i,
    term: "Energy Star",
    note: "a government-backed energy-efficiency certification.",
  },
  {
    pattern: /\bfsc\b|forest stewardship council/i,
    term: "FSC Certified",
    note: "an independently audited forestry sourcing standard.",
  },
  {
    pattern: /\bcradle to cradle\b/i,
    term: "Cradle to Cradle",
    note: "a third-party product lifecycle certification.",
  },
  {
    pattern: /\bgold standard\b/i,
    term: "Gold Standard",
    note: "an independently verified carbon offset standard.",
  },
  {
    pattern: /\brainforest alliance\b/i,
    term: "Rainforest Alliance Certified",
    note: "a third-party sustainable agriculture standard.",
  },
  {
    pattern: /\bgots\b|global organic textile standard/i,
    term: "GOTS",
    note: "an independently audited organic textile standard.",
  },
  {
    pattern: /\bepeat\b/i,
    term: "EPEAT",
    note: "a registered electronics sustainability rating.",
  },
  {
    pattern: /\bleaping bunny\b/i,
    term: "Leaping Bunny",
    note: "an independently verified cruelty-free standard.",
  },
];

const ALTERNATIVES: { category: RegExp; suggestion: string }[] = [
  {
    category: /\b(cleaner|cleaning|detergent|spray)\b/i,
    suggestion: "a baking soda and vinegar mix handles most household cleaning jobs with no packaging at all.",
  },
  {
    category: /\b(bottle|packaging|plastic|wrap)\b/i,
    suggestion: "look for refill-station or bulk options that avoid new packaging entirely, rather than a \"recyclable\" single-use item.",
  },
  {
    category: /\b(cotton|shirt|clothing|textile|fabric)\b/i,
    suggestion: "buying secondhand avoids the manufacturing footprint entirely, regardless of what the new item's label claims.",
  },
];

export function analyze(rawText: string): AuditResult | null {
  const text = rawText.trim();
  if (!text) return null;

  const flagged: FlaggedTerm[] = [];
  const seen = new Set<string>();
  for (const { pattern, sin, explanation } of VAGUE_TERMS) {
    const match = text.match(pattern);
    if (match && !seen.has(match[0].toLowerCase())) {
      seen.add(match[0].toLowerCase());
      flagged.push({ term: match[0], sin, explanation });
    }
  }

  const certifications: Certification[] = [];
  const seenCerts = new Set<string>();
  for (const { pattern, term, note } of CERTIFICATIONS) {
    if (pattern.test(text) && !seenCerts.has(term)) {
      seenCerts.add(term);
      certifications.push({ term, note });
    }
  }

  let score = 78; // neutral baseline
  score -= flagged.length * 13;
  score += certifications.length * 14;
  score = Math.max(5, Math.min(100, score));

  let grade: string;
  let role: AuditResult["role"];
  let risk: AuditResult["risk"];
  if (score >= 88) {
    grade = "A"; role = "success"; risk = "Low";
  } else if (score >= 75) {
    grade = "B"; role = "success"; risk = "Low";
  } else if (score >= 58) {
    grade = "C"; role = "warning"; risk = "Medium";
  } else if (score >= 40) {
    grade = "D"; role = "danger"; risk = "High";
  } else {
    grade = "F"; role = "danger"; risk = "High";
  }

  const summaryLines: string[] = [];
  if (flagged.length === 0 && certifications.length === 0) {
    summaryLines.push(
      "No specific environmental buzzwords or certifications were detected in this text — try pasting the exact label or claim language for a sharper read."
    );
  }
  if (flagged.length > 0) {
    summaryLines.push(
      `${flagged.length} unsubstantiated ${flagged.length === 1 ? "term" : "terms"} flagged:`
    );
  }
  for (const f of flagged) {
    summaryLines.push(`**"${f.term}"** (${f.sin}) — ${f.explanation}`);
  }
  if (certifications.length > 0) {
    summaryLines.push(
      `${certifications.length === 1 ? "One real credential" : "Real credentials"} found:`
    );
    for (const c of certifications) {
      summaryLines.push(`**${c.term}** — ${c.note}`);
    }
  }

  let alternative: string | undefined;
  for (const { category, suggestion } of ALTERNATIVES) {
    if (category.test(text)) {
      alternative = suggestion;
      break;
    }
  }

  return { grade, role, risk, score, flagged, certifications, summaryLines, alternative };
}

// Debate mode: re-scores when the person supplies new evidence in their
// rebuttal (e.g. citing a real certification not in the original text).
export function reconsider(previous: AuditResult, rebuttalText: string): { reply: string; updated: AuditResult | null } {
  const rebuttalCerts: Certification[] = [];
  for (const { pattern, term, note } of CERTIFICATIONS) {
    if (pattern.test(rebuttalText) && !previous.certifications.some((c) => c.term === term)) {
      rebuttalCerts.push({ term, note });
    }
  }

  if (rebuttalCerts.length > 0) {
    const newCertifications = [...previous.certifications, ...rebuttalCerts];
    const newScore = Math.min(100, previous.score + rebuttalCerts.length * 14);
    let grade: string, role: AuditResult["role"], risk: AuditResult["risk"];
    if (newScore >= 88) { grade = "A"; role = "success"; risk = "Low"; }
    else if (newScore >= 75) { grade = "B"; role = "success"; risk = "Low"; }
    else if (newScore >= 58) { grade = "C"; role = "warning"; risk = "Medium"; }
    else if (newScore >= 40) { grade = "D"; role = "danger"; risk = "High"; }
    else { grade = "F"; role = "danger"; risk = "High"; }

    const updated: AuditResult = {
      ...previous,
      grade,
      role,
      risk,
      score: newScore,
      certifications: newCertifications,
    };

    return {
      reply: `${rebuttalCerts.map((c) => `**${c.term}**`).join(", ")} ${rebuttalCerts.length === 1 ? "is a" : "are"} real, independently verifiable credential — that's genuine evidence, not marketing language. Updating the grade to **${grade}**.`,
      updated,
    };
  }

  return {
    reply:
      "That's still an assertion rather than a citation. If you can name the specific certifying body, standard, or lifecycle study behind the claim, the grade can move — without one, it stands.",
    updated: null,
  };
}
