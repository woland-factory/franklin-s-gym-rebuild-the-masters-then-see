import { Fragment } from "react";
import type { Alignment, AlignmentPair, DiffSpan } from "../lib/db";
import styles from "./AlignmentView.module.css";

interface AlignmentViewProps {
  title: string;
  author: string;
  alignment: Alignment;
}

// A neutral, factual length line per matched pair. Never a judgment.
function lengthLine(delta: number): string {
  if (delta === 0) return "Same length";
  const n = Math.abs(delta);
  const word = n === 1 ? "word" : "words";
  return delta > 0 ? `${n} ${word} longer` : `${n} ${word} shorter`;
}

type Side = "original" | "yours";

const SIDE_CLASS: Record<Side, string> = {
  original: styles.markOriginal,
  yours: styles.markYours,
};

// Every span renders as an escaped text node. Words that differ are wrapped in
// a <mark> carrying the side's hue plus a per-side underline pattern, so the
// difference reads without color. `data-side` is the stable, non-color hook.
function Spans({ spans, side }: { spans: DiffSpan[]; side: Side }) {
  return (
    <>
      {spans.map((span, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {span.kind === "same" ? (
            span.text
          ) : (
            <mark className={`${styles.mark} ${SIDE_CLASS[side]}`} data-side={side}>
              {span.text}
            </mark>
          )}
        </Fragment>
      ))}
    </>
  );
}

function MatchedPair({ pair }: { pair: AlignmentPair }) {
  return (
    <div className={styles.pairGrid}>
      <div className={styles.side}>
        <span className={styles.sideLabel}>Original</span>
        <p className={styles.sentence}>
          {pair.originalSpans ? (
            <Spans spans={pair.originalSpans} side="original" />
          ) : (
            pair.original
          )}
        </p>
      </div>
      <div className={styles.side}>
        <span className={styles.sideLabel}>Yours</span>
        <p className={styles.sentence}>
          {pair.yourSpans ? (
            <Spans spans={pair.yourSpans} side="yours" />
          ) : (
            pair.your
          )}
        </p>
      </div>
      <p className={styles.lengthLine}>{lengthLine(pair.lengthDelta)}</p>
    </div>
  );
}

// Presentational and pure: passage meta plus a computed Alignment in, marked-up
// pairs out. The same component serves a saved attempt and the worked example.
// It states differences only. It never scores and never says one version is
// better.
export function AlignmentView({ title, author, alignment }: AlignmentViewProps) {
  return (
    <div className={styles.wrap}>
      <header>
        <h1 className={styles.title}>{title}</h1>
        {author && <p className={styles.meta}>{author}</p>}
      </header>

      <ul className={styles.legend} aria-label="What the marks mean">
        <li className={styles.legendItem}>
          <span
            className={`${styles.swatch} ${styles.markOriginal}`}
            data-side="original"
            aria-hidden="true"
          />
          In the original
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.swatch} ${styles.markYours}`}
            data-side="yours"
            aria-hidden="true"
          />
          In yours
        </li>
      </ul>

      <ol className={styles.pairs}>
        {alignment.pairs.map((pair, i) => (
          <li key={i} className={styles.pair} data-match={pair.matchType}>
            {pair.matchType === "matched" && <MatchedPair pair={pair} />}
            {pair.matchType === "omission" && (
              <div className={styles.single}>
                <span className={styles.sideLabel}>Only in the original</span>
                <p className={styles.sentence}>
                  <mark className={`${styles.mark} ${styles.markOriginal}`} data-side="original">
                    {pair.original}
                  </mark>
                </p>
              </div>
            )}
            {pair.matchType === "addition" && (
              <div className={styles.single}>
                <span className={styles.sideLabel}>Only in yours</span>
                <p className={styles.sentence}>
                  <mark className={`${styles.mark} ${styles.markYours}`} data-side="yours">
                    {pair.your}
                  </mark>
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
