import { useMemo, useState } from "react";
import { PassageCard } from "../components/PassageCard";
import { seedPassages } from "../data/seedPassages";
import type { LengthBand } from "../data/seedPassages.types";
import styles from "./Library.module.css";

type Filter = "all" | LengthBand;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

// Read-only browser over the seed library. Filterable by length band. Starting
// an attempt from a passage arrives in a later release.
export function Library() {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? seedPassages : seedPassages.filter((p) => p.lengthBand === filter)),
    [filter],
  );

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

      <ul className={styles.grid}>
        {visible.map((passage) => (
          <li key={passage.id}>
            <PassageCard passage={passage} />
          </li>
        ))}
      </ul>
    </section>
  );
}
