"use client";

import { useRouter } from "next/navigation";
import { FILTER_OPTIONS, filtersHref, SORTS, type OrderFilters } from "@/modules/orders/orders-list";

type Props = {
  filters: OrderFilters;
  money: boolean;
  packageNames: string[];
  writers: { id: string; displayName: string }[];
  myName: string;
};

// The dropdowns under the tabs. Each choice changes the address, so the view can be bookmarked.
export function OrderFilterBar({ filters, money, packageNames, writers, myName }: Props) {
  const router = useRouter();
  const go = (change: Partial<OrderFilters>) => router.push(filtersHref(filters, change), { scroll: false });

  const select = (
    name: "pkg" | "writer" | "pay" | "due" | "placed" | "sort",
    label: string,
    options: [string, string][],
  ) => (
    <label className="flt">
      <span>{label}</span>
      <select
        value={filters[name]}
        className={name !== "sort" && filters[name] ? "on" : undefined}
        onChange={(event) => go({ [name]: event.target.value })}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );

  const sorts = Object.entries(SORTS).filter(([key]) => money || key !== "amount");
  return (
    <div className="flt-bar">
      {select("pkg", "Package", [
        ["", "All packages"],
        ...packageNames.map((name): [string, string] => [name, name]),
        ["single", "Single services"],
      ])}
      {select("writer", "Writer", [
        ["", "All writers"],
        ["open", "Open: not accepted"],
        ["mine", `Mine (${myName})`],
        ...writers.map((writer): [string, string] => [writer.id, writer.displayName]),
      ])}
      {select("pay", "Payment", [["", "Any payment"], ...Object.entries(FILTER_OPTIONS.pay)])}
      {select("due", "Due", [["", "Any time"], ...Object.entries(FILTER_OPTIONS.due)])}
      {select("placed", "Placed", [["", "Any date"], ...Object.entries(FILTER_OPTIONS.placed)])}
      {select("sort", "Sort", sorts)}
    </div>
  );
}
