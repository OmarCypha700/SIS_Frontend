"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader, RoleGate } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";

export default function GradingSchemesPage() {
  const { data, error, loading, reload } = useApi("/grading-schemes/", { page_size: 50 });
  const [editing, setEditing] = useState(null);

  async function makeDefault(scheme) {
    try {
      await api.post(`/grading-schemes/${scheme.id}/set-default/`);
      toast.success(`${scheme.name} is now the default scheme.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <RoleGate roles={["ADMIN"]}>
      <PageHeader
        title="Grading schemes"
        description="Grade boundaries, grade points and rounding. New result sheets use the default scheme; each sheet keeps the scheme it started with."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus /> New scheme
          </Button>
        }
      />
      {loading && !data && <LoadingBlock />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.results?.length === 0 && <EmptyState title="No grading schemes" description="Create one before lecturers can enter marks." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.results?.map((scheme) => (
          <Card key={scheme.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {scheme.name}
                  {scheme.is_default && <Badge>Default</Badge>}
                  {!scheme.is_active && <Badge variant="outline">Inactive</Badge>}
                </CardTitle>
                <CardDescription>
                  Totals rounded half-up to {scheme.round_to_decimals} decimal place(s); boundaries are inclusive.
                  {scheme.in_use && " Used by submitted results, so its bands are locked."}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {!scheme.is_default && scheme.is_active && (
                  <Button size="sm" variant="outline" onClick={() => makeDefault(scheme)}>
                    <Star /> Make default
                  </Button>
                )}
                <Button size="icon-sm" variant="ghost" aria-label={`Edit ${scheme.name}`} onClick={() => setEditing(scheme)}>
                  <Pencil />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Grade</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="pr-6">Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheme.bands.map((band) => (
                    <TableRow key={band.id}>
                      <TableCell className="pl-6 font-semibold">{band.letter}</TableCell>
                      <TableCell className="tabular-nums">
                        {Number(band.min_score)} – {Number(band.max_score)}
                      </TableCell>
                      <TableCell className="tabular-nums">{band.grade_point}</TableCell>
                      <TableCell className="pr-6">{band.is_pass ? band.remark || "Pass" : <span className="text-destructive">{band.remark || "Fail"}</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
      {editing && <SchemeDialog scheme={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </RoleGate>
  );
}

const EMPTY_BAND = { letter: "", min_score: "", max_score: "", grade_point: "", is_pass: true, remark: "" };

function SchemeDialog({ scheme, onClose, onSaved }) {
  const isEdit = Boolean(scheme.id);
  const [name, setName] = useState(scheme.name || "");
  const [description, setDescription] = useState(scheme.description || "");
  const [decimals, setDecimals] = useState(String(scheme.round_to_decimals ?? 0));
  const [active, setActive] = useState(scheme.is_active ?? true);
  const [bands, setBands] = useState(() =>
    scheme.bands?.length
      ? scheme.bands.map((b) => ({ ...b, min_score: String(Number(b.min_score)), max_score: String(Number(b.max_score)) }))
      : [{ ...EMPTY_BAND, letter: "A", min_score: "70", max_score: "100", grade_point: "4" }, { ...EMPTY_BAND, letter: "F", min_score: "0", max_score: "69", grade_point: "0", is_pass: false }],
  );
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const locked = Boolean(scheme.in_use);

  const update = (i, patch) => setBands((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  async function save() {
    setPending(true);
    setErrors({});
    const payload = { name, description, is_active: active };
    if (!locked) {
      payload.round_to_decimals = Number(decimals);
      payload.bands = bands.map(({ id, ...b }) => b);
    }
    try {
      if (isEdit) await api.patch(`/grading-schemes/${scheme.id}/`, payload);
      else await api.post("/grading-schemes/", payload);
      toast.success("Grading scheme saved.");
      onSaved();
      onClose();
    } catch (e) {
      const fe = fieldErrors(e);
      setErrors(fe);
      toast.error(fe.bands || errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit grading scheme" : "New grading scheme"}</DialogTitle>
          <DialogDescription>
            Bands must cover 0–100 with no gaps or overlaps at the chosen precision (for whole numbers: 0–49, 50–59, …).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="scheme-name" label="Name" required error={errors.name}>
            <Input id="scheme-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="scheme-decimals" label="Round totals to" error={errors.round_to_decimals}>
            <NativeSelect id="scheme-decimals" value={decimals} onChange={(e) => setDecimals(e.target.value)} disabled={locked}>
              <option value="0">Whole numbers</option>
              <option value="1">1 decimal place</option>
              <option value="2">2 decimal places</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 self-end pb-1 text-sm">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} /> Active
          </label>
          <Field id="scheme-description" label="Description" className="sm:col-span-3">
            <Input id="scheme-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-2">
          <div className="hidden grid-cols-[4rem_1fr_1fr_1fr_1.5fr_4rem_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Grade</span>
            <span>Min</span>
            <span>Max</span>
            <span>Points</span>
            <span>Remark</span>
            <span>Pass</span>
            <span />
          </div>
          {bands.map((band, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 sm:grid-cols-[4rem_1fr_1fr_1fr_1.5fr_4rem_2.5rem] sm:items-center">
              <Input aria-label="Grade letter" value={band.letter} disabled={locked} onChange={(e) => update(i, { letter: e.target.value })} />
              <Input aria-label="Minimum" type="number" step="0.01" value={band.min_score} disabled={locked} onChange={(e) => update(i, { min_score: e.target.value })} />
              <Input aria-label="Maximum" type="number" step="0.01" value={band.max_score} disabled={locked} onChange={(e) => update(i, { max_score: e.target.value })} />
              <Input aria-label="Grade points" type="number" step="0.01" value={band.grade_point} disabled={locked} onChange={(e) => update(i, { grade_point: e.target.value })} />
              <Input aria-label="Remark" value={band.remark} disabled={locked} onChange={(e) => update(i, { remark: e.target.value })} />
              <label className="flex items-center gap-1 text-sm">
                <Checkbox checked={band.is_pass} disabled={locked} onCheckedChange={(v) => update(i, { is_pass: Boolean(v) })} />
                <span className="sm:sr-only">Pass</span>
              </label>
              <Button variant="ghost" size="icon-sm" aria-label="Remove band" disabled={locked} onClick={() => setBands((prev) => prev.filter((_, idx) => idx !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          {!locked && (
            <Button variant="outline" size="sm" onClick={() => setBands((prev) => [...prev, { ...EMPTY_BAND }])}>
              <Plus /> Add band
            </Button>
          )}
          {errors.bands && <p className="text-sm text-destructive">{errors.bands}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Save scheme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
