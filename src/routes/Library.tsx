import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PassageCard } from "../components/PassageCard";
import { PastePassage } from "../components/PastePassage";
import { seedPassages } from "../data/seedPassages";
import type { LengthBand, SeedPassage } from "../data/seedPassages.types";
import type { PassageSnapshot } from "../lib/db";
import { createAttempt } from "../lib/store";
import styles from "./Library.module.css";

type Filter = "all" | LengthBand;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

function snapshotFromSeed(passage: SeedPassage): PassageSnapshot {
  return {
    originalPassageId: passage.id,
    title: passage.title,
    author: passage.author,
    source: passage.source,
    year: passage.year,
    sentences: passage.sentences,
    isCustom: false,
  };
}

// Browse the seed library or paste your own, then start an attempt. Starting
// creates a local attempt and opens the condense screen.
const START_BLOCKED = "This device blocked the save. Allow storage, then try again.";

export function Library() {
  const [filter, setFilter] = useState<Filter>("all");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const navigate = useNavigate();

  const visible = useMemo(
    () => (filter === "all" ? seedPassages : seedPassages.filter((p) => p.lengthBand === filter)),
    [filter],
  );

  // Creates the attempt and opens condense. Rejects on a storage failure so the
  // caller can surface a next step.
  async function start(passage: PassageSnapshot) {
    const attempt = await createAttempt(passage, Date.now());
    navigate(`/condense/${attempt.id}`);
  }

  async function startFromCard(passage: PassageSnapshot) {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await start(passage);
    } catch {
      setStartError(START_BLOCKED);
      setStarting(false);
    }
  }

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>The library</h1>
        <p className={styles.subtitle}>
          Public-domain passages, hand-split into sentences. Pick one to train against.
        </p>
      </header>

      <div className={styles.filters} role="group" aria-label="Filter by length">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={styles.filter}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {startError && (
        <p className={styles.startError} role="alert">
          {startError}
        </p>
      )}

      <ul className={styles.grid}>
        {visible.map((passage) => (
          <li key={passage.id}>
            <PassageCard
              passage={passage}
              starting={starting}
              onStart={() => startFromCard(snapshotFromSeed(passage))}
            />
          </li>
        ))}
      </ul>

      <div className={styles.paste}>
        <PastePassage onStart={start} starting={starting} />
      </div>
    </section>
  );
}
