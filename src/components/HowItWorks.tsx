import { useEffect, useRef } from "react";
import { seedPassages } from "../data/seedPassages";
import styles from "./HowItWorks.module.css";

interface HowItWorksProps {
  onClose: () => void;
}

// Static explainer opened by "See an example". It shows the four steps of the
// loop and one real seed sentence as an illustration. It computes nothing.
// EPIC 3 replaces this target with the live worked attempt and its alignment.
const STEPS = [
  "Pick a passage and note each sentence in a few words.",
  "The original locks away for a few days so memory does the work.",
  "When it opens, rebuild the passage from your notes alone.",
  "See your version beside the original, sentence by sentence.",
];

const SAMPLE = seedPassages.find((p) => p.id === "twain-life-on-the-mississippi");

export function HowItWorks({ onClose }: HowItWorksProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="how-title" className={styles.title}>
            How it works
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {SAMPLE && (
          <figure className={styles.sample}>
            <p className={styles.sampleText}>{SAMPLE.sentences[0]}</p>
            <figcaption className={styles.sampleMeta}>
              {SAMPLE.author}, {SAMPLE.title}
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}
