"use client";

const GRADE_COLOR: Record<string, string> = {
  A: "#2F6844",
  "A-": "#2F6844",
  "A+": "#2F6844",
  B: "#4C7A2E",
  "B-": "#4C7A2E",
  "B+": "#2F6844",
  C: "#C98A1D",
  "C-": "#C98A1D",
  "C+": "#4C7A2E",
  D: "#B25A1D",
  "D-": "#B25A1D",
  "D+": "#C98A1D",
  F: "#B23A2E",
  "?": "#54626B",
};

export function Stamp({ grade }: { grade: string }) {
  const color = GRADE_COLOR[grade] ?? "#54626B";
  return (
    <div
      key={grade}
      className="stamp stamp-animate font-display text-lg"
      style={{ color }}
    >
      Grade {grade}
    </div>
  );
}
