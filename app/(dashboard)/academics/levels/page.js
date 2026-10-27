"use client";

import { ResourcePage } from "@/components/resource-page";

const FIELDS = [
  { name: "name", label: "Name", required: true, hint: "For example Level 100 or Year 1" },
  { name: "order", label: "Order", type: "number", min: 1, required: true, hint: "1 for the first level, 2 for the next…" },
];

const COLUMNS = [
  { key: "order", header: "Order" },
  { key: "name", header: "Level", cell: (r) => <span className="font-medium">{r.name}</span> },
];

export default function LevelsPage() {
  return (
    <ResourcePage
      title="Levels"
      description="The levels or years of study used by this institution."
      endpoint="/levels/"
      columns={COLUMNS}
      fields={FIELDS}
      singular="level"
      readRoles={["ADMIN", "REGISTRAR"]}
      writeRoles={["ADMIN"]}
    />
  );
}
