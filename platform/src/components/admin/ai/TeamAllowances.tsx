"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  setAiEnabledAction,
  setAllowanceAction,
  setPoolFallbackAction,
} from "@/app/(admin)/admin/(signed-in)/ai/actions";
import { formatNumber } from "@/lib/money";

type Person = {
  id: string;
  name: string;
  owner: boolean;
  paused: boolean;
  aiEnabled: boolean;
  allowance: number | null;
  used: number;
};

// "Share among the team": each person's monthly allowance, what they've used, and AI on or off for them
export function TeamAllowances({ team, poolFallback }: { team: Person[]; poolFallback: boolean }) {
  return (
    <>
      <table className="admin-table ai-team">
        <thead>
          <tr>
            <th>Who</th>
            <th>Monthly allowance</th>
            <th>Used this month</th>
            <th>AI on</th>
          </tr>
        </thead>
        <tbody>
          {team.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </tbody>
      </table>
      <PoolSwitch on={poolFallback} />
    </>
  );
}

function PersonRow({ person }: { person: Person }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const over = person.allowance !== null && person.used >= person.allowance;
  const pct = person.allowance ? Math.min(100, Math.round((person.used / person.allowance) * 100)) : 0;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await setAllowanceAction(person.id, data);
      if (result.ok) {
        setEditing(false);
        setError(null);
      } else setError(result.error);
    });
  };
  const toggle = () =>
    startTransition(async () => {
      const result = await setAiEnabledAction(person.id, !person.aiEnabled);
      setError(result.ok ? null : result.error);
    });

  return (
    <tr className={person.aiEnabled ? undefined : "row-off"}>
      <td>
        <span className="cell-main">{person.name}</span>
        <span className="cell-sub">{person.owner ? "Owner" : person.paused ? "Paused" : "Writer"}</span>
      </td>
      <td>
        {person.owner ? (
          <span className="cell-sub">No limit</span>
        ) : editing ? (
          <form className="allow-form" onSubmit={save}>
            <label className="sr-only" htmlFor={`allow-${person.id}`}>
              Monthly allowance for {person.name}
            </label>
            <input
              id={`allow-${person.id}`}
              name="allowance"
              inputMode="numeric"
              defaultValue={person.allowance === null ? "" : formatNumber(person.allowance)}
              placeholder="No limit"
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              Save
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="allow-value" onClick={() => setEditing(true)}>
            {person.allowance === null ? "No limit, shared pool" : `${formatNumber(person.allowance)} tokens`}
            <span>Change</span>
          </button>
        )}
        {error && (
          <small className="field-error" role="alert">
            {error}
          </small>
        )}
      </td>
      <td>
        <span className={over ? "num late" : "num"}>{formatNumber(person.used)}</span>
        {person.allowance !== null && (
          <span className={over ? "meter low" : "meter"} aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </td>
      <td>
        {person.owner ? (
          <span className="cell-sub">Always</span>
        ) : (
          <span className="switch-field">
            <button
              type="button"
              role="switch"
              aria-checked={person.aiEnabled}
              aria-label={`AI for ${person.name}`}
              className="switch"
              onClick={toggle}
              disabled={pending}
            >
              <span />
            </button>
            <span className={person.aiEnabled ? undefined : "is-off"} aria-hidden="true">
              {person.aiEnabled ? "On" : "Off"}
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

function PoolSwitch({ on }: { on: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="ai-setting">
      <div>
        <b>When someone&apos;s allowance runs out, let them use the shared pool</b>
        <span>
          {on
            ? "On: allowances are a guide. Anyone over theirs carries on, and shows in red here."
            : "Off: anyone who uses up their allowance waits until next month, or until you give them more."}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Let people use the shared pool once their allowance runs out"
        className="switch"
        disabled={pending}
        onClick={() => startTransition(async () => void (await setPoolFallbackAction(!on)))}
      >
        <span />
      </button>
    </div>
  );
}
