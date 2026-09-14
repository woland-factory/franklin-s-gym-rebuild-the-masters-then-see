import type { SeedPassage } from "../data/seedPassages.types";
import styles from "./PassageCard.module.css";

interface PassageCardProps {
  passage: SeedPassage;
}

const BAND_LABEL: Record<SeedPassage["lengthBand"], string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

// One seed passage: title, author, source, and length band, with an expandable
// preview. Read-only in this release.
export function PassageCard({ passage }: PassageCardProps) {
  const { title, author, source, year, lengthBand, sentences } = passage;
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.band} data-band={lengthBand}>
          {BAND_LABEL[lengthBand]}
        </span>
      </div>
      <p className={styles.meta}>
        {author} · {year}
      </p>
      <details className={styles.details}>
        <summary className={styles.summary}>
          Preview ({sentences.length} sentences)
        </summary>
        <p className={styles.preview}>{sentences.join(" ")}</p>
      </details>
      <p className={styles.source}>Source: {source}</p>
    </article>
  );
}
