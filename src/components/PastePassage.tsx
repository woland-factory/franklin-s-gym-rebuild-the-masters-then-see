import { useState } from "react";
import type { PassageSnapshot } from "../lib/db";
import { MAX_SENTENCES, MAX_WORDS } from "../data/seedPassages.types";
import { MIN_SENTENCES, segmentAndValidate } from "../lib/segment";
import styles from "./PastePassage.module.css";

interface PastePassageProps {
  // Called with a frozen snapshot once the pasted text passes validation. The
  // parent creates the attempt and navigates. It may reject on a storage
  // failure, which surfaces here as an inline next step.
  onStart: (passage: PassageSnapshot) => void | Promise<void>;
  starting?: boolean;
}

const START_BLOCKED = "This device blocked the save. Allow storage, then try again.";

function errorFor(
  result: Extract<ReturnType<typeof segmentAndValidate>, { ok: false }>,
): string {
  switch (result.reason) {
    case "too-short":
      return `Paste at least ${MIN_SENTENCES} sentences to train on.`;
    case "too-many-sentences":
      return `Keep it to ${MAX_SENTENCES} sentences. Yours has ${result.count}.`;
    case "too-long":
      return `Trim to ${MAX_WORDS} words to keep the rebuild focused. Yours has ${result.count}.`;
  }
}

// Paste your own passage. Segments client-side, enforces the cap, and keeps the
// text on the device. No network call runs from this surface.
export function PastePassage({ onStart, starting = false }: PastePassageProps) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = starting || submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = segmentAndValidate(text);
    if (!result.ok) {
      setError(errorFor(result));
      return;
    }
    setError(null);
    const snapshot: PassageSnapshot = {
      originalPassageId: null,
      title: title.trim() || "Your passage",
      author: "",
      source: "",
      year: null,
      sentences: result.sentences,
      isCustom: true,
    };
    setSubmitting(true);
    try {
      await onStart(snapshot);
    } catch {
      setSubmitting(false);
      setError(START_BLOCKED);
    }
  }

  return (
    <section className={styles.wrap} aria-labelledby="paste-title">
      <h2 id="paste-title" className={styles.title}>
        Paste your own
      </h2>
      <p className={styles.cap}>Up to {MAX_WORDS} words, {MAX_SENTENCES} sentences. It stays on this device.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="paste-passage-title">
          Title
        </label>
        <input
          id="paste-passage-title"
          className={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your passage"
        />
        <label className={styles.label} htmlFor="paste-passage-text">
          Passage
        </label>
        <textarea
          id="paste-passage-text"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste a passage you want to train against."
          aria-describedby={error ? "paste-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <p id="paste-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Starting" : "Start with this"}
        </button>
      </form>
    </section>
  );
}
