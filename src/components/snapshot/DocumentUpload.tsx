"use client";

// Optional document upload (Contracts v2.3, #77): up to 3 files, read one at a time by /api/extract. Each result
// pre-fills the form through onExtracted; the user reviews every number. Manual entry stays the default path.
import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, FileUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, extractDocument } from "@/lib/client/api";
import type { ExtractedSnapshot } from "@/types";
import { hasValues } from "./draft";

const MAX_FILES = 3;
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const FALLBACK = "Couldn't read that file. You can type your numbers instead.";
export const PRIVACY_LINE = "Sprout's AI reads your file to fill in this form, then discards it. Sprout never stores it.";

interface Upload {
  id: number;
  name: string;
  status: "reading" | "done" | "error";
  message: string;
  notes: string[];
}

// Checked here too: the hosting platform rejects bodies over 4.5 MB before our route can answer.
function fileProblem(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Upload a PDF or a photo (PNG, JPG, or WebP).";
  if (file.size > MAX_BYTES) return "That file is over 4 MB. Try a smaller file or a photo of the page.";
  if (file.size === 0) return FALLBACK;
  return null;
}

function doneMessage(ex: ExtractedSnapshot): string {
  if (!hasValues(ex)) return "Sprout didn't find numbers to fill in from this file.";
  return ex.confidence === "low"
    ? "Filled in what Sprout could read, but parts were hard to read. Check each number below."
    : "Filled in what Sprout found. Check each number below.";
}

let uploadCounter = 0;

export function DocumentUpload({ onExtracted }: { onExtracted: (ex: ExtractedSnapshot) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const left = MAX_FILES - uploads.filter((u) => u.status === "done").length;

  const patch = (id: number, next: Partial<Upload>) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...next } : u)));

  async function readFiles(files: File[]) {
    setBusy(true);
    for (const file of files.slice(0, left)) {
      const id = ++uploadCounter;
      const problem = fileProblem(file);
      setUploads((list) => [...list, { id, name: file.name, status: problem ? "error" : "reading", message: problem ?? "Sprout is reading it...", notes: [] }]);
      if (problem) continue;
      try {
        const ex = await extractDocument(file);
        onExtracted(ex);
        patch(id, { status: "done", message: doneMessage(ex), notes: ex.notes });
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          setUploads((list) => list.filter((u) => u.id !== id));
          setUnavailable(true);
          break;
        }
        patch(id, { status: "error", message: error instanceof ApiError ? error.message : FALLBACK });
      }
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 id="upload-title" className="text-lg font-semibold">
          Upload a statement (optional)
        </h2>
        <p className="text-sm text-muted-foreground">
          A bank statement, pay stub, credit card statement, or credit report. PDF or photo, up to 4 MB.
        </p>
      </div>
      <p className="text-sm">{PRIVACY_LINE}</p>

      {unavailable ? (
        <p role="status" className="text-sm font-medium">
          Upload is unavailable right now. You can type your numbers below.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = ""; // allow picking the same file again
              if (files.length > 0) void readFiles(files);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            disabled={busy || left <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp aria-hidden /> {uploads.some((u) => u.status === "done") ? "Add another file" : "Choose a file"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {left > 0 ? `Up to ${left} more file${left === 1 ? "" : "s"}.` : "That's 3 files. Edit anything below."}
          </span>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3 text-sm">
              <span className="flex items-start gap-2">
                {u.status === "reading" && <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin" />}
                {u.status === "done" && <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />}
                {u.status === "error" && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="text-muted-foreground">{u.message}</span>
                </span>
              </span>
              {u.notes.length > 0 && (
                <ul className="ml-6 list-disc pl-4 text-muted-foreground">
                  {u.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
