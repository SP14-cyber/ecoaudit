"use client";

import { useMemo, useRef, useState } from "react";
import { Stamp } from "./components/Stamp";
import { FormattedText } from "./lib/format";

type Tab = "audit" | "debate" | "letter";
type ChatTurn = { role: "user" | "assistant"; content: string };

function extractGrade(text: string): string {
  const labeled = text.match(/GRADE:\s*([A-F][+-]?)/i);
  if (labeled) return labeled[1].toUpperCase();
  const loose = text.match(/\bgrade[:\s]+([A-F][+-]?)\b/i);
  return loose ? loose[1].toUpperCase() : "?";
}

function extractRisk(text: string): string {
  const match = text.match(/risk level:?\s*(low|medium|high)/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : "";
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mediaType: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("audit");
  const [caseNumber] = useState(() => Math.floor(100000 + Math.random() * 899999));

  // --- Audit state ---
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Debate state ---
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [rebuttal, setRebuttal] = useState("");
  const [debateLoading, setDebateLoading] = useState(false);

  // --- Letter state ---
  const [companyName, setCompanyName] = useState("");
  const [letterFormat, setLetterFormat] = useState<"email" | "social">("email");
  const [letterResult, setLetterResult] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);

  const grade = useMemo(() => (auditResult ? extractGrade(auditResult) : null), [auditResult]);
  const risk = useMemo(() => (auditResult ? extractRisk(auditResult) : ""), [auditResult]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function runAudit() {
    if (!textInput && !imageFile) {
      setAuditError("Paste some text or upload an image first.");
      return;
    }
    setAuditError(null);
    setAuditLoading(true);
    setAuditResult(null);
    try {
      let image = null;
      if (imageFile) {
        const { base64, mediaType } = await fileToBase64(imageFile);
        image = { base64, mediaType };
      }
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed.");
      setAuditResult(data.result);
      setChat([
        { role: "user", content: data.originalPrompt },
        { role: "assistant", content: data.result },
      ]);
    } catch (err: any) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }

  async function sendRebuttal() {
    if (!rebuttal.trim()) return;
    const newHistory: ChatTurn[] = [...chat, { role: "user", content: rebuttal }];
    setChat(newHistory);
    setRebuttal("");
    setDebateLoading(true);
    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Debate turn failed.");
      const updated = [...newHistory, { role: "assistant" as const, content: data.result }];
      setChat(updated);
      // if the grade changed mid-debate, reflect it on the case file
      const newGrade = extractGrade(data.result);
      if (newGrade !== "?") {
        setAuditResult(data.result);
      }
    } catch (err: any) {
      setChat([...newHistory, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setDebateLoading(false);
    }
  }

  async function draftLetter() {
    if (!auditResult) return;
    setLetterLoading(true);
    setLetterResult(null);
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditFinding: auditResult,
          companyName,
          format: letterFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Letter generation failed.");
      setLetterResult(data.result);
    } catch (err: any) {
      setLetterResult(`Error: ${err.message}`);
    } finally {
      setLetterLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "audit", label: "Audit" },
    { id: "debate", label: "Debate Mode" },
    { id: "letter", label: "Call-Out Letter" },
  ];

  return (
    <main className="min-h-screen bg-paper flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-4xl text-ink tracking-tight">EcoAudit</h1>
          <span className="font-display text-xs text-inkMuted uppercase tracking-widest">
            Case No. {caseNumber}
          </span>
        </div>
        <p className="text-inkMuted mb-8 text-sm">
          The AI Greenwashing Whistleblower &amp; Citizen Science Tool — powered by Claude
        </p>

        {/* Folder tabs */}
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`folder-tab px-6 py-2.5 text-sm font-medium ${
                tab === t.id
                  ? "bg-panel text-ink"
                  : "bg-paperDark text-inkMuted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
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

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm px-4 py-2 rounded-md border border-hairline bg-paper hover:bg-paperDark transition-colors"
                >
                  {imageFile ? "Change photo" : "Attach photo of label/receipt"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Uploaded evidence"
                    className="h-14 w-14 object-cover rounded border border-hairline"
                  />
                )}
              </div>

              {auditError && (
                <p className="mt-3 text-sm text-stampRed">{auditError}</p>
              )}

              <button
                onClick={runAudit}
                disabled={auditLoading}
                className="mt-5 w-full sm:w-auto px-6 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
              >
                {auditLoading ? "Auditing…" : "Run Audit"}
              </button>

              {auditResult && (
                <>
                  <hr className="tear-line" />
                  <div className="flex items-center gap-4 mb-5 flex-wrap">
                    {grade && <Stamp grade={grade} />}
                    {risk && (
                      <span className="text-xs uppercase tracking-widest text-inkMuted font-display">
                        Risk Level: {risk}
                      </span>
                    )}
                  </div>
                  <div className="text-ink text-[15px]">
                    <FormattedText text={auditResult} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "debate" && (
            <div>
              {!auditResult ? (
                <p className="text-inkMuted text-sm">
                  Run an audit first — then come argue with EcoAudit here.
                </p>
              ) : (
                <>
                  <div className="space-y-4 mb-5 max-h-[26rem] overflow-y-auto pr-1">
                    {chat.slice(1).map((turn, i) => (
                      <div
                        key={i}
                        className={`text-sm ${
                          turn.role === "user"
                            ? "bg-paperDark rounded-md px-3 py-2"
                            : ""
                        }`}
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
                      placeholder="Cite a certification, a detail EcoAudit missed…"
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
                <p className="text-inkMuted text-sm">
                  Run an audit first — the letter will be based on that finding.
                </p>
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
                      <input
                        type="radio"
                        checked={letterFormat === "email"}
                        onChange={() => setLetterFormat("email")}
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={letterFormat === "social"}
                        onChange={() => setLetterFormat("social")}
                      />
                      Social media post
                    </label>
                  </div>
                  <button
                    onClick={draftLetter}
                    disabled={letterLoading}
                    className="px-6 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 disabled:opacity-50"
                  >
                    {letterLoading ? "Drafting…" : "Draft it"}
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
          Findings are Claude&apos;s reasoning against named frameworks (FTC Green Guides,
          TerraChoice&apos;s Seven Sins of Greenwashing) — an education tool, not a legal determination.
        </p>
      </div>
    </main>
  );
}
