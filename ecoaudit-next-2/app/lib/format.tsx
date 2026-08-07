import React from "react";

// Minimal formatter: handles **bold**, "- " bullet lines, and paragraph
// breaks, without pulling in a full markdown dependency for a hackathon build.
export function FormattedText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/);

  const renderInline = (line: string, key: number) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="text-ink font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.every((l) => /^[-*]\s+/.test(l.trim()));
        if (isList && lines.length > 0) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1.5">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().replace(/^[-*]\s+/, ""), li)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="leading-relaxed">
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {renderInline(l, li)}
                {li < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
