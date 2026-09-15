import { Link } from "react-router-dom";
import type { AttemptRecord } from "../lib/db";
import { attemptState, ripeLabel } from "../lib/attempts";
import { buildIcs, downloadIcs } from "../lib/ics";
import styles from "./AttemptCard.module.css";

interface AttemptCardProps {
  attempt: AttemptRecord;
  now: number;
}

const STATE_LABEL = {
  condensing: "Condensing",
  vaulted: "Vaulted",
  ripe: "Ready",
  reconstructed: "Aligned",
} as const;

function hintedCount(attempt: AttemptRecord): number {
  return attempt.hints.filter((h) => h.trim().length > 0).length;
}

// One attempt in the dashboard pipeline. It shows the passage title and author,
// its state, and the one action that fits that state. It never renders the
// passage sentences.
export function AttemptCard({ attempt, now }: AttemptCardProps) {
  const state = attemptState(attempt, now);
  const { title, author } = attempt.passage;

  function addToCalendar() {
    if (attempt.vaultedUntil == null) return;
    const ics = buildIcs({
      uid: `${attempt.id}@franklins-gym`,
      start: attempt.vaultedUntil,
      stamp: Date.now(),
      title: `Rebuild "${title}" in Franklin's Gym`,
      description: "Your hints are ready. Rebuild it from memory.",
    });
    const slug = attempt.passage.originalPassageId ?? attempt.id;
    downloadIcs(`franklins-gym-${slug}.ics`, ics);
  }

  return (
    <article className={styles.card} data-state={state}>
      <div className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.chip} data-state={state}>
          {STATE_LABEL[state]}
        </span>
      </div>
      {author && <p className={styles.meta}>{author}</p>}

      {state === "condensing" && (
        <>
          <p className={styles.sub}>
            {hintedCount(attempt)} of {attempt.passage.sentences.length} hinted
          </p>
          <Link to={`/condense/${attempt.id}`} className={`btn btn-primary ${styles.action}`}>
            Resume
          </Link>
        </>
      )}

      {state === "vaulted" && (
        <>
          <p className={styles.sub}>
            {attempt.vaultedUntil != null ? ripeLabel(attempt.vaultedUntil, now) : "Vaulted"}
          </p>
          <button
            type="button"
            className={`btn btn-secondary ${styles.action}`}
            onClick={addToCalendar}
          >
            Add to calendar
          </button>
        </>
      )}

      {state === "ripe" && (
        <>
          <p className={styles.sub}>The vault is open. Rebuild it from your hints.</p>
          <Link to={`/reconstruct/${attempt.id}`} className={`btn btn-primary ${styles.action}`}>
            Rebuild
          </Link>
        </>
      )}

      {state === "reconstructed" && (
        <>
          <p className={styles.sub}>Rebuilt and aligned.</p>
          <Link to={`/align/${attempt.id}`} className={`btn btn-primary ${styles.action}`}>
            See alignment
          </Link>
        </>
      )}
    </article>
  );
}
