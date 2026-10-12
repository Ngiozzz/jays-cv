"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

type Props = { text: string; label: string; className?: string };

export function CopyButton({ text, label, className = "btn btn-primary btn-sm" }: Props) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <button type="button" className={className} onClick={copy}>
      <Icon name="copy" size={16} />
      {copied === "yes" ? "Copied!" : copied === "failed" ? "Select the text and copy it" : label}
    </button>
  );
}
