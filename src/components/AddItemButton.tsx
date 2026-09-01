"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addItem, addItemFromUrl, type AddItemResult } from "@/lib/actions/add-item";
import { CATEGORY_OPTIONS } from "@/lib/types";

const ITEM_CATEGORIES = CATEGORY_OPTIONS.filter((c) => c.value !== "outfits");

type Mode = "photo" | "link";

const initialState: AddItemResult = {};

export function AddItemButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("photo");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: AddItemResult, formData: FormData) => {
      const result =
        mode === "photo" ? await addItem(formData) : await addItemFromUrl(formData);
      if (!result.error) {
        setOpen(false);
        setPreviewUrl(null);
        formRef.current?.reset();
        router.refresh();
      }
      return result;
    },
    initialState
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function close() {
    if (isPending) return;
    setOpen(false);
    setPreviewUrl(null);
    formRef.current?.reset();
  }

  function switchMode(next: Mode) {
    if (isPending || next === mode) return;
    setMode(next);
    setPreviewUrl(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="eyebrow flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 2v12M2 8h12" />
        </svg>
        Add Item
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${open ? "" : "pointer-events-none"}`}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-ink/25 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add an item"
          className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line-dark bg-cream p-8 shadow-xl transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-2xl tracking-tight">Add an item</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              disabled={isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-card hover:text-ink"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                stroke="currentColor"
                strokeWidth="1.25"
                aria-hidden="true"
              >
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>

          {/* Mode switch */}
          <div className="mt-5 flex gap-1 rounded-full border border-line-dark bg-card/40 p-1">
            <button
              type="button"
              onClick={() => switchMode("photo")}
              className={`eyebrow flex-1 cursor-pointer rounded-full py-2 transition-colors ${
                mode === "photo" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              Upload a Photo
            </button>
            <button
              type="button"
              onClick={() => switchMode("link")}
              className={`eyebrow flex-1 cursor-pointer rounded-full py-2 transition-colors ${
                mode === "link" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              Paste a Link
            </button>
          </div>

          <form
            ref={formRef}
            action={formAction}
            key={mode}
            className="mt-5 flex flex-col gap-5"
          >
            {mode === "photo" ? (
              <>
                {/* Photo */}
                <div>
                  <p className="eyebrow text-muted">Photo</p>
                  <label className="mt-2.5 flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-dark bg-card/40 transition-colors hover:border-accent">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Selected preview"
                        className="h-full w-full object-contain p-3"
                      />
                    ) : (
                      <span className="eyebrow px-6 text-center text-muted">
                        Click to choose a photo — a screenshot works fine
                      </span>
                    )}
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      required
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Name */}
                <div>
                  <p className="eyebrow text-muted">Name</p>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Sage Linen Camp Shirt"
                    className="mt-2.5 w-full border border-line-dark bg-transparent px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <p className="eyebrow text-muted">Category</p>
                  <div className="relative mt-2.5">
                    <select
                      name="category"
                      required
                      defaultValue=""
                      className="w-full appearance-none border border-line-dark bg-transparent px-3.5 py-2.5 pr-9 text-sm focus:border-ink focus:outline-none"
                    >
                      <option value="" disabled>
                        Choose a category
                      </option>
                      {ITEM_CATEGORIES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 12 8"
                      className="pointer-events-none absolute top-1/2 right-3.5 h-2 w-3 -translate-y-1/2 text-ink-soft"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      aria-hidden="true"
                    >
                      <path d="M1 1.5l5 5 5-5" />
                    </svg>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted">
                  The background is removed automatically, so use a photo of
                  just the item — laid flat or on a hanger works best.
                </p>
              </>
            ) : (
              <>
                <div>
                  <p className="eyebrow text-muted">Aritzia Product Link</p>
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="https://www.aritzia.com/us/en/product/..."
                    className="mt-2.5 w-full border border-line-dark bg-transparent px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
                  />
                </div>

                <p className="text-xs leading-relaxed text-muted">
                  We&apos;ll pull the name, category, and a flat product photo
                  automatically, then remove the background — no photo needed.
                </p>
              </>
            )}

            {state.error && (
              <p className="text-sm text-blush-deep">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="eyebrow mt-1 w-full cursor-pointer rounded-full border border-line-dark bg-ink py-3 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
            >
              {isPending
                ? mode === "photo"
                  ? "Adding to your closet…"
                  : "Fetching and adding…"
                : "Add to Closet"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
