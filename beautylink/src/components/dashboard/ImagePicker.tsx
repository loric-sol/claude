"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "../icons";

type Option = { url: string; label: string };

/**
 * Lets the owner upload a photo or choose a bundled illustration.
 * Posts `<name>_file` (new upload) and `<name>_url` (chosen/existing URL, empty = none).
 */
export function ImagePicker({
  name, label, initialUrl, library, error, aspect = "square", allowRemove = true, hint,
}: {
  name: string;
  label: string;
  initialUrl: string | null;
  library: readonly Option[];
  error?: string;
  aspect?: "square" | "wide" | "round";
  allowRemove?: boolean;
  hint?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const preview = localPreview ?? (url || null);
  const shape = aspect === "wide" ? "aspect-[16/7] w-full max-w-md" : aspect === "round" ? "h-24 w-24 rounded-full" : "h-28 w-28";

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setClientError(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setClientError("Please choose a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setClientError("Images must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    setLocalPreview(URL.createObjectURL(f));
    setShowLibrary(false);
  }

  function choose(u: string) {
    setUrl(u);
    setLocalPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const shownError = clientError ?? error;
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap items-start gap-4">
        <div className={`${shape} flex shrink-0 items-center justify-center overflow-hidden ${aspect === "round" ? "" : "rounded-2xl"} border border-line bg-accent-soft/60`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected image preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="text-muted" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary cursor-pointer px-3.5 py-2 text-xs focus-within:ring-2 focus-within:ring-ink">
            <Upload width={16} height={16} /> Upload photo
            <input ref={fileRef} type="file" name={`${name}_file`} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
          </label>
          <button type="button" className="btn-secondary px-3.5 py-2 text-xs" onClick={() => setShowLibrary((v) => !v)} aria-expanded={showLibrary}>
            <ImageIcon width={16} height={16} /> {showLibrary ? "Hide library" : "Choose from library"}
          </button>
          {allowRemove && preview && (
            <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => choose("")}>
              <X width={14} height={14} /> Remove
            </button>
          )}
        </div>
      </div>
      <input type="hidden" name={`${name}_url`} value={url} />
      {showLibrary && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label={`${label} library`}>
          {library.map((o) => (
            <li key={o.url}>
              <button
                type="button"
                onClick={() => choose(o.url)}
                aria-pressed={!localPreview && url === o.url}
                className={`block w-full overflow-hidden rounded-xl border-2 transition ${!localPreview && url === o.url ? "border-ink" : "border-transparent hover:border-line"}`}
                title={o.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.url} alt={o.label} className={`${aspect === "wide" ? "aspect-[16/7]" : "aspect-square"} w-full object-cover`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {shownError ? <p className="mt-1.5 text-xs text-red-700">{shownError}</p> : <p className="hint">{hint ?? "JPG, PNG or WebP, up to 5 MB. Library images are illustrations — your own photos convert better."}</p>}
    </fieldset>
  );
}
