"use client";

import { Fragment, useState, type ReactNode } from "react";

type Item = { key: string; category: string; node: ReactNode };

type Props = { label: string; items: Item[]; gridClassName: string };

// Topic buttons above a grid (Samples, Career tips). Without JavaScript every item still shows.
export function CategoryFilter({ label, items, gridClassName }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const categories = [...new Set(items.map((item) => item.category))];
  const shown = active ? items.filter((item) => item.category === active) : items;

  return (
    <>
      <div className="filters" role="group" aria-label={label}>
        <FilterButton pressed={active === null} onClick={() => setActive(null)}>
          All
        </FilterButton>
        {categories.map((category) => (
          <FilterButton key={category} pressed={active === category} onClick={() => setActive(category)}>
            {category}
          </FilterButton>
        ))}
      </div>
      <div className={gridClassName}>
        {shown.map((item) => (
          <Fragment key={item.key}>{item.node}</Fragment>
        ))}
      </div>
    </>
  );
}

function FilterButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="filter-btn" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}
