"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import type { ComponentKey } from "~/lib/scoring";

const skillFields: {
  key: ComponentKey;
  label: string;
  max: number;
  step?: number;
}[] = [
  { key: "reading", label: "Reading", max: 44 },
  { key: "useOfEnglish", label: "Use of English", max: 28 },
  { key: "writing", label: "Writing", max: 40 },
  { key: "listening", label: "Listening", max: 30 },
  { key: "speaking", label: "Speaking", max: 75, step: 0.5 },
];

type FormValues = {
  examDate: string;
  reading: string;
  useOfEnglish: string;
  writing: string;
  listening: string;
  speaking: string;
  notes: string;
};

type ScoreInput = {
  examDate: Date;
  reading: number | null;
  useOfEnglish: number | null;
  writing: number | null;
  listening: number | null;
  speaking: number | null;
  notes?: string;
};

export function ScoreEntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isSubmitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScoreInput) => void;
  initialValues?: Partial<{
    examDate: Date;
    reading: number | null;
    useOfEnglish: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
    notes: string | null;
  }>;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const [values, setValues] = useState<FormValues>(() => ({
    examDate: initialValues?.examDate
      ? new Date(initialValues.examDate).toISOString().split("T")[0]!
      : new Date().toISOString().split("T")[0]!,
    reading: initialValues?.reading?.toString() ?? "",
    useOfEnglish: initialValues?.useOfEnglish?.toString() ?? "",
    writing: initialValues?.writing?.toString() ?? "",
    listening: initialValues?.listening?.toString() ?? "",
    speaking: initialValues?.speaking?.toString() ?? "",
    notes: initialValues?.notes ?? "",
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parse = (v: string) => (v === "" ? null : Number(v));
    onSubmit({
      examDate: new Date(values.examDate + "T00:00:00"),
      reading: parse(values.reading),
      useOfEnglish: parse(values.useOfEnglish),
      writing: parse(values.writing),
      listening: parse(values.listening),
      speaking: parse(values.speaking),
      notes: values.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold">
              {initialValues ? "Edit Exam Scores" : "Enter Exam Scores"}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Enter the raw scores for each skill. Leave blank if not taken.
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="flex flex-col gap-4 px-6 pb-2">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Exam Date
              </label>
              <input
                type="date"
                value={values.examDate}
                onChange={(e) =>
                  setValues((v) => ({ ...v, examDate: e.target.value }))
                }
                className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-6 py-4 text-sm"
                required
              />
            </div>

            {/* Skills grid */}
            <div className="grid grid-cols-2 gap-4">
              {skillFields.map((field) => (
                <div
                  key={field.key}
                  className={field.key === "speaking" ? "col-span-1" : ""}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      {field.label}
                    </label>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Max: {field.max}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={field.max}
                    step={field.step ?? 1}
                    value={values[field.key]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.key]: e.target.value }))
                    }
                    placeholder=""
                    className="mt-1.5 w-full rounded-full border border-[var(--border)] bg-[var(--accent)] px-6 py-4 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Notes (optional)
              </label>
              <textarea
                value={values.notes}
                onChange={(e) =>
                  setValues((v) => ({ ...v, notes: e.target.value }))
                }
                placeholder="Add any notes about this exam..."
                maxLength={500}
                rows={3}
                className="rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--accent)] px-6 py-4 text-sm"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="px-6 text-sm text-red-500">{error}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Save Scores
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
