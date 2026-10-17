"use client";

import { useEffect, useState } from "react";

type Props = {
  // True while the AI is working; when it turns false the bar shows 100% for a moment, then hides
  active: boolean;
  // How long this task usually takes
  seconds: number;
  // What's happening, in order ("Reading the CV", "Writing feedback"); spread over the expected time
  steps: string[];
  className?: string;
};

// The AI doesn't say how far along it is, so this is an estimate from the usual time: it eases
// towards 95% and only reaches 100% when the answer has actually arrived.
export function AiProgress({ active, seconds, steps, className }: Props) {
  const [wasActive, setWasActive] = useState(active);
  const [finishing, setFinishing] = useState(false);
  // Each run starts a fresh bar, so it counts from 0 again
  const [run, setRun] = useState(0);
  if (wasActive !== active) {
    setWasActive(active);
    setFinishing(!active);
    if (active) setRun(run + 1);
  }

  useEffect(() => {
    if (!finishing) return;
    const hide = setTimeout(() => setFinishing(false), 700);
    return () => clearTimeout(hide);
  }, [finishing]);

  if (!active && !finishing) return null;
  const classes = ["ai-progress", finishing ? "done" : "", className ?? ""].filter(Boolean).join(" ");
  if (finishing) return <Bar className={classes} percent={100} label="Done" />;
  return <Running key={run} className={classes} seconds={seconds} steps={steps} />;
}

function Running({ seconds, steps, className }: { seconds: number; steps: string[]; className: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(tick);
  }, []);
  const percent = estimate(elapsed, seconds);
  const label =
    elapsed > seconds * 1.5
      ? "Taking a little longer than usual…"
      : `${steps[Math.min(steps.length - 1, Math.floor((percent / 95) * steps.length))]}…`;
  return <Bar className={className} percent={percent} label={label} />;
}

function Bar({ percent, label, className }: { percent: number; label: string; className: string }) {
  return (
    <div className={className}>
      <div className="ai-progress-top">
        <span>{label}</span>
        <b>{percent}%</b>
      </div>
      <div
        className="ai-progress-bar"
        role="progressbar"
        aria-label="AI progress (estimated)"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }}></span>
      </div>
    </div>
  );
}

// Just over 80% at the usual time, then creeping towards 95% (never past it while waiting)
export function estimate(elapsed: number, seconds: number): number {
  return Math.min(95, Math.round(95 * (1 - Math.exp((-2 * elapsed) / Math.max(1, seconds)))));
}
