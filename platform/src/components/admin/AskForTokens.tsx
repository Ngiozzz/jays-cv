"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { RequestDialog } from "@/components/admin/dashboard/TokenRequest";
import { Icon } from "@/components/icons/Icon";

// Wherever the AI says "your tokens have run out", a way to ask for more right there: the owner
// gets the request form (it goes to the developer's Command Center); a writer is told to ask the owner.

const CanRequestTokens = createContext(false);

// Set once by the admin frame, from the signed-in member's permissions
export function TokensAccessProvider({ canRequest, children }: { canRequest: boolean; children: ReactNode }) {
  return <CanRequestTokens.Provider value={canRequest}>{children}</CanRequestTokens.Provider>;
}

export const isTokensOut = (message: string | null | undefined) => /tokens have run out/i.test(message ?? "");

// Shows only when the message is about tokens running out
export function AskForTokens({ message }: { message: string | null | undefined }) {
  const canRequest = useContext(CanRequestTokens);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (!isTokensOut(message)) return null;
  if (!canRequest) {
    return <p className="ask-tokens hint-sm">Ask the business owner to request more AI tokens.</p>;
  }
  return (
    <div className="ask-tokens">
      {sent ? (
        <span className="hint-sm">
          <Icon name="check" size={16} /> Request sent. The AI starts working again as soon as the tokens are added.
        </span>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} />
          Ask for more tokens
        </button>
      )}
      {open && (
        <RequestDialog
          onClose={() => setOpen(false)}
          onSent={() => {
            setSent(true);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
