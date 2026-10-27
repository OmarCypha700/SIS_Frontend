"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Horizontal bars for a single magnitude series (one hue, no legend). Each bar has a
 * hover tooltip and the value is printed at the bar end; a table of the same numbers is
 * provided for screen readers.
 */
export function BarList({ items, empty = "No data." }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const height = Math.max(120, items.length * 34 + 16);
  return (
    <figure>
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap={8}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={96}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
              formatter={(value) => [value, "Students"]}
            />
            <Bar
              dataKey="value"
              fill="var(--primary)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              label={{ position: "right", fill: "var(--foreground)", fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.title || item.label}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
