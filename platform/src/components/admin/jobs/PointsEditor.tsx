"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import { splitPoints } from "./points";

type Props = {
  id: string;
  points: string[];
  onChange: (points: string[]) => void;
  // "Add a responsibility", "Add a requirement"
  addLabel: string;
  placeholder: string;
  // In a plain form (Post a job): each point is sent under this name
  name?: string;
};

// A list of points, one per row (a long point wraps onto more lines): Enter starts the next point, Backspace on an empty one removes it,
// and pasting a list (bullets, numbers or one per line) splits it into points
export function PointsEditor({ id, points, onChange, addLabel, placeholder, name }: Props) {
  const rows = points.length ? points : [""];
  const inputs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const focus = (index: number) => requestAnimationFrame(() => inputs.current[index]?.focus());

  const update = (index: number, value: string) => onChange(rows.map((point, i) => (i === index ? value : point)));
  const insertAfter = (index: number, added: string[] = [""]) => {
    onChange([...rows.slice(0, index + 1), ...added, ...rows.slice(index + 1)]);
    focus(index + added.length);
  };
  const remove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
    focus(Math.max(0, index - 1));
  };
  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
    focus(to);
  };

  const onKey = (index: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      insertAfter(index);
    } else if (event.key === "Backspace" && rows[index] === "" && rows.length > 1) {
      event.preventDefault();
      remove(index);
    } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      move(index, event.key === "ArrowUp" ? -1 : 1);
    }
  };
  const onPaste = (index: number) => (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = splitPoints(event.clipboardData.getData("text"));
    if (pasted.length < 2) return;
    event.preventDefault();
    const [first, ...rest] = pasted;
    const merged = rows.map((point, i) => (i === index ? `${point}${first}` : point));
    onChange([...merged.slice(0, index + 1), ...rest, ...merged.slice(index + 1)]);
    focus(index + rest.length);
  };

  return (
    <div className="points" id={id}>
      <ol>
        {rows.map((point, index) => (
          <li key={index}>
            <span className="points-n" aria-hidden="true">
              {index + 1}
            </span>
            <textarea
              ref={(el) => {
                inputs.current[index] = el;
              }}
              id={index === 0 ? `${id}-0` : undefined}
              rows={1}
              name={name}
              value={point}
              placeholder={index === 0 ? placeholder : "Next point"}
              aria-label={`Point ${index + 1}`}
              maxLength={500}
              onChange={(event) => update(index, event.target.value.replace(/\n/g, " "))}
              onKeyDown={onKey(index)}
              onPaste={onPaste(index)}
            />
            <button
              type="button"
              className="points-x"
              aria-label={`Remove point ${index + 1}`}
              onClick={() => remove(index)}
              disabled={rows.length === 1 && point === ""}
            >
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="points-add" onClick={() => insertAfter(rows.length - 1)}>
        <Icon name="plus" size={14} />
        {addLabel}
      </button>
    </div>
  );
}

// The points editor as a field of a plain form: it keeps its own points, starting from the job's
export function PointsField(props: Omit<Props, "points" | "onChange"> & { initial: string[]; name: string }) {
  const { initial, ...rest } = props;
  const [points, setPoints] = useState(initial);
  return <PointsEditor {...rest} points={points} onChange={setPoints} />;
}
