"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";

const LANGUAGES: Record<string, unknown> = {
  typescript, ts: typescript, javascript, js: javascript, tsx, jsx, python, py: python,
  bash, sh: bash, shell: bash, json, css, html: markup, markup, sql,
};
for (const [name, grammar] of Object.entries(LANGUAGES)) SyntaxHighlighter.registerLanguage(name, grammar);

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = language && language in LANGUAGES ? language : "text";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[#2a2a33] bg-[#0f0f14] text-left">
      <div className="flex h-9 items-center justify-between border-b border-[#2a2a33] px-3.5">
        <span className="font-mono text-xs text-[#8b8b96]">{language || "text"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-white"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        PreTag="pre"
        customStyle={{ margin: 0, padding: "14px 16px", background: "transparent", fontSize: 13, lineHeight: 1.65 }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
