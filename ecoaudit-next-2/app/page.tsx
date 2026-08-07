"use client";

import { useState } from "react";
import { Stamp } from "./components/Stamp";
import { FormattedText } from "./lib/format";
import { analyze, reconsider, AuditResult } from "./lib/engine";

type Tab = "audit" | "debate" | "letter";
type ChatTurn = { role: "user" | "assistant"; content: string };

function resultToText(result: AuditResult): string {
  const lines = [...result.summaryLines];
  if (result.alternative) {
    lines.push(`Lower-impact alternative: ${result.alternative}`);
  }
  return lines.join("\n\n");
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("audit");
  const [caseNumber] = useState(() => Math.floor(100000 + Math.random() * 899999));

  // --- Audit state ---
  const [textInput, setTextInput] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // --- Debate state ---
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [rebuttal, setRebuttal] = useState("");
  const [debateLoading, setDebateLoading] = useState(false);

  // --- Letter state ---
  const [companyName, setCompanyName] = useState("");
  const [letterFormat, setLetterFormat] = useState<"email" | "social">("email");
  const [letterResult, setLetterResult] = useState<string | null>(null);

  function runAudit() {
    if (!textInput.trim()) {
      setAuditError("Paste a product claim or label text first.");
      return;
    }
    setAuditError(null);
    setAuditing(true);
    setLetterResult(null);
    setTimeout(() => {
      const result = analyze(textInput);
      setAuditResult(result);
      setChat(result ? [{ role: "assistant", content: resultToText(result) }] : []);
      setAuditing(false);
    }, 400);
  }

  function sendRebuttal() {
    if (!rebuttal.trim() || !auditResult) return;
    const userTurn: ChatTurn = { role: "user", content: rebuttal };
    const newHistory = [...chat, userTurn];
    setChat(newHistory);
    setRebuttal("");
    setDebateLoading(true);
    setTimeout(() => {
      const { reply, updated } = reconsider(auditResult, rebuttal);
      setChat([...newHistory, { role: "assistant", content: reply }]);
      if (updated) setAuditResult(updated);
      setDebateLoading(false);
    }, 350);
  }

  function draftLetter() {
    if (!auditResult) return;
    const flaggedList = auditResult.flagged.map((f) => `"${f.term}"`).join(", ");
    const body =
      letterFormat === "email"
        ? `Subject: Request for substantiation of environmental claims\n\nHello ${companyName || "there"},\n\nI'm a student reviewing your product's environmental claims as part of a citizen-science audit. ${
            flaggedList
              ? `Specifically, I'd like to understand what stands behind the terms ${flaggedList} on your packaging or marketing.`
              : "I'd like to understand what independent standard or data backs your sustainability claims."
          } Could you point me to the specific certifying body, standard, or lifecycle data involved?\n\nI'd be glad to update my findings once I have that documentation — I'm not assuming bad faith, just asking for transparency.\n\nThanks for your time,\n[Your name]`
        : `Curious what's actually behind ${companyName ? `@${companyName.replace(/\s+/g, "")}'s` : "this brand's"} ${
            flaggedList || "sustainability"
          } claims? So am I. Asking for the certifying body or standard behind it — transparency shouldn't be too much to ask. #Greenwashing #ShowYourWork`;
    setLetterResult(body);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "audit", label: "Audit" },
    { id: "debate", label: "Debate Mode" },
    { id: "letter", label: "Call-Out Letter" },
  ];

  return (
    <main className="min-h-screen bg-paper flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-4xl text-ink tracking-tight">EcoAudit</h1>
          <span className="font-display text-xs text-inkMuted uppercase tracking-widest">
            Case No. {caseNumber}
          </span>
        </div>
        <p className="text-inkMuted mb-8 text-sm">
          The Greenwashing Whistleblower &amp; Citizen Science Tool — runs entirely in your browser, free
        </p>

        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`folder-tab px-6 py-2.5 text-sm font-medium ${
                tab === t.id ? "bg-panel text-ink" : "bg-paperDark text-inkMuted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="paper-texture bg-panel rounded-b-lg rounded-tr-lg border border-hairline p-6 sm:p-8 shadow-sm">
          {tab === "audit" && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-inkMuted mb-2 font-display">
                Exhibit A — Claim Text
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='e.g. "100% Organic Cotton — Biodegradable Packaging — Carbon Neutral by 2030"'
                rows={5}
                className="w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-inkMuted/60 focus:outline-none focus:ring-2 focus:ring-ink/30"
              />

              {auditError && <p className="mt-3 text-sm text-stampRed">{auditError}</p>}

              <button
                onClick={runAudit}
                disabled={auditing}
                className="mt-5 w-full sm:w-auto px-6 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
              >
                {auditing ? "Auditing…" : "Run Audit"}
              </button>

              {auditResult && (
                <>
                  <hr className="tear-line" />
                  <div className="flex items-center gap-4 mb-5 flex-wrap">
                    <Stamp grade={auditResult.grade} />
                    <span className="text-xs uppercase tracking-widest text-inkMuted font-display">
                      Risk Level: {auditResult.risk}
                    </span>
                  </div>
                  <div className="text-ink text-[15px]">
                    <FormattedText text={resultToText(auditResult)} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "debate" && (
            <div>
              {!auditResult ? (
                <p className="text-inkMuted text-sm">Run an audit first — then come argue with EcoAudit here.</p>
              ) : (
                <>
                  <div className="space-y-4 mb-5 max-h-[26rem] overflow-y-auto pr-1">
                    {chat.map((turn, i) => (
                      <div
                        key={i}
                        className={`text-sm ${turn.role === "user" ? "bg-paperDark rounded-md px-3 py-2" : ""}`}
                      >
                        <div className="text-[10px] uppercase tracking-widest text-inkMuted mb-1 font-display">
                          {turn.role === "user" ? "Your rebuttal" : "EcoAudit"}
                        </div>
                        <FormattedText text={turn.content} />
                      </div>
                    ))}
                    {debateLoading && (
                      <p className="text-inkMuted text-sm italic">EcoAudit is weighing your argument…</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={rebuttal}
                      onChange={(e) => setRebuttal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendRebuttal()}
                      placeholder="Cite a certification, e.g. 'It's Fair Trade Certified'…"
                      className="flex-1 rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
                    />
                    <button
                      onClick={sendRebuttal}
                      disabled={debateLoading}
                      className="px-5 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "letter" && (
            <div>
              {!auditResult ? (
                <p className="text-inkMuted text-sm">Run an audit first — the letter will be based on that finding.</p>
              ) : (
                <>
                  <label className="block text-xs uppercase tracking-widest text-inkMuted mb-2 font-display">
                    Company / brand name
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. GreenBrand Co."
                    className="w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ink/30"
                  />
                  <div className="flex gap-4 mb-5 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={letterFormat === "email"} onChange={() => setLetterFormat("email")} />
                      Email
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={letterFormat === "social"} onChange={() => setLetterFormat("social")} />
                      Social media post
                    </label>
                  </div>
                  <button
                    onClick={draftLetter}
                    className="px-6 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90"
                  >
                    Draft it
                  </button>

                  {letterResult && (
                    <>
                      <hr className="tear-line" />
                      <div className="text-ink text-[15px]">
                        <FormattedText text={letterResult} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-inkMuted text-xs mt-6">
          Findings come from a rule-based engine grounded in the FTC Green Guides and TerraChoice&apos;s
          Seven Sins of Greenwashing — runs free in your browser, no API or account required.
        </p>
      </div>
    </main>
  );
}
