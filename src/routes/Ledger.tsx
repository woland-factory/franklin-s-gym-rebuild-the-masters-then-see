import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { TrendChart } from "../components/TrendChart";
import { dateLabel } from "../lib/attempts";
import type { AttemptRecord } from "../lib/db";
import { fidelityMetrics, type FidelityMetrics } from "../lib/metrics";
import { importAttempts, listAttempts } from "../lib/store";
import {
  buildExport,
  downloadJson,
  IMPORT_MAX_BYTES,
  parseExport,
} from "../lib/transfer";
import styles from "./Ledger.module.css";

type LoadStatus = "loading" | "ready" | "error";

const LEDGER_PAGE_SIZE = 20;
const TREND_MAX_POINTS = 60;

const PARSE_ERROR = "That file did not match. Choose a JSON export from Franklin's Gym.";

interface Completed {
  attempt: AttemptRecord;
  metrics: FidelityMetrics;
  when: number;
}

interface ImportStatus {
  role: "status" | "alert";
  text: string;
}

function timeOf(a: AttemptRecord): number {
  return a.reconstructedAt ?? a.createdAt;
}

function signed(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

function fileDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function restoredMessage(added: number, skipped: number): string {
  if (added === 0) return "All of those attempts were already here.";
  const restored = `Restored ${added} ${added === 1 ? "attempt" : "attempts"}.`;
  if (skipped === 0) return restored;
  const dupes = `${skipped} ${skipped === 1 ? "was" : "were"} already here.`;
  return `${restored} ${dupes}`;
}

// The hidden-but-focusable file input styled as a button, shared by the empty
// state and the files block. The input is visually hidden so keyboard and
// screen reader users still reach it.
function ImportControl({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className={`btn btn-secondary ${styles.importLabel}`} aria-disabled={busy}>
      {busy ? "Reading" : label}
      <input
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

// The ledger: the dated archive of completed loops, a fidelity trend, and the
// user's whole record as a plain file. It reads the alignments the engine
// already saved and derives every number on read. None of it is persisted.
export function Ledger() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [visible, setVisible] = useState(LEDGER_PAGE_SIZE);
  const [busy, setBusy] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);

  const load = useCallback(() => {
    let live = true;
    setStatus("loading");
    listAttempts()
      .then((rows) => {
        if (!live) return;
        setAttempts(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const handleFile = useCallback((file: File) => {
    if (file.size > IMPORT_MAX_BYTES) {
      setImportStatus({ role: "alert", text: PARSE_ERROR });
      return;
    }
    setBusy(true);
    readText(file)
      .then(async (text) => {
        const result = parseExport(text);
        if (!result.ok) {
          setImportStatus({ role: "alert", text: PARSE_ERROR });
          return;
        }
        const { added, skipped } = await importAttempts(result.attempts);
        const rows = await listAttempts();
        setAttempts(rows);
        setImportStatus({ role: "status", text: restoredMessage(added, skipped) });
      })
      .catch(() => {
        setImportStatus({ role: "alert", text: PARSE_ERROR });
      })
      .finally(() => setBusy(false));
  }, []);

  if (status === "loading") {
    return <Skeleton lines={6} label="Loading your ledger" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Reload your ledger"
        message="This device blocked local storage. Allow it, then try again."
        actionLabel="Try again"
        onAction={load}
      />
    );
  }

  const completed: Completed[] = attempts
    .filter((a) => a.status === "reconstructed" && a.alignment)
    .map((a) => ({ attempt: a, metrics: fidelityMetrics(a.alignment!), when: timeOf(a) }));

  const newestFirst = [...completed].sort((x, y) => y.when - x.when);
  const ascending = [...completed].sort((x, y) => x.when - y.when);
  const trend = ascending.slice(-TREND_MAX_POINTS);

  if (completed.length === 0) {
    return (
      <EmptyState
        title="Your record starts with the first rebuild"
        description="Every aligned attempt files here with its date, its fidelity numbers, and a link back to the alignment."
        primary={
          <Link to="/library" className="btn btn-primary">
            Browse passages
          </Link>
        }
        secondary={
          <>
            <ImportControl label="Restore from a file" busy={busy} onFile={handleFile} />
            {importStatus && (
              <p className={styles.importMessage} role={importStatus.role}>
                {importStatus.text}
              </p>
            )}
          </>
        }
      />
    );
  }

  const recoveredPoints = trend.map((c) => ({
    date: c.when,
    value: c.metrics.recoveredShare * 100,
  }));
  const deltaPoints = trend.map((c) => ({ date: c.when, value: c.metrics.sentenceDelta }));
  const maxAbsDelta = Math.max(0, ...deltaPoints.map((p) => Math.abs(p.value)));
  const deltaBound = Math.max(3, maxAbsDelta);

  const latestRecovered = Math.round(recoveredPoints[recoveredPoints.length - 1].value);
  const latestDelta = deltaPoints[deltaPoints.length - 1].value;

  const shown = newestFirst.slice(0, visible);

  return (
    <section>
      <h1 className={styles.title}>Your ledger</h1>

      <section className={styles.trend} aria-label="Trend">
        <h2 className={styles.sectionHeading}>Trend</h2>
        <p className={styles.caption}>
          How much of the hinted substance each rebuild recovered. Fidelity, never a grade.
        </p>

        <div className={styles.chartBlock}>
          <h3 className={styles.chartTitle}>Hinted ideas recovered</h3>
          <p className={styles.fidelityTag}>Reconstruction fidelity</p>
          <TrendChart
            points={recoveredPoints}
            yMin={0}
            yMax={100}
            yTicks={[0, 50, 100]}
            formatValue={(v) => `${Math.round(v)}%`}
            ariaLabel={`Hinted ideas recovered across ${trend.length} attempts, latest ${latestRecovered} percent.`}
          />
        </div>

        <div className={styles.chartBlock}>
          <h3 className={styles.chartTitle}>Sentence count difference</h3>
          <p className={styles.fidelityTag}>Reconstruction fidelity</p>
          <TrendChart
            points={deltaPoints}
            yMin={-deltaBound}
            yMax={deltaBound}
            yTicks={[-deltaBound, 0, deltaBound]}
            formatValue={signed}
            zeroEmphasis
            ariaLabel={`Sentence count difference across ${trend.length} attempts, latest ${signed(latestDelta)}.`}
          />
          <p className={styles.caption}>
            0 means your rebuild used the same number of sentences as the original.
          </p>
        </div>

        {completed.length > TREND_MAX_POINTS && (
          <p className={styles.caption}>Showing the last 60 attempts.</p>
        )}
      </section>

      <ol className={styles.list}>
        {shown.map(({ attempt, metrics }) => (
          <li key={attempt.id}>
            <Link to={`/align/${attempt.id}`} className={styles.entry}>
              <span className={styles.entryDate}>{dateLabel(attempt.reconstructedAt!)}</span>
              <span className={styles.entryTitle}>
                {attempt.passage.title}
                {attempt.passage.author ? `, ${attempt.passage.author}` : ""}
              </span>
              <span className={styles.entryMetric}>
                Recovered {metrics.recoveredSentences} of {metrics.originalSentences}
              </span>
              <span className={styles.entryMetric}>
                {metrics.originalSentences} sentences in the original, {metrics.yourSentences} in
                yours
              </span>
              <span className={styles.entryAction}>See alignment</span>
            </Link>
          </li>
        ))}
      </ol>

      {visible < newestFirst.length && (
        <button
          type="button"
          className={`btn btn-secondary ${styles.showMore}`}
          onClick={() => setVisible((v) => v + LEDGER_PAGE_SIZE)}
        >
          Show more
        </button>
      )}

      <section className={styles.files} aria-label="Your files">
        <h2 className={styles.sectionHeading}>Your files</h2>
        <p className={styles.caption}>Your whole record as one plain JSON file. Yours to keep.</p>
        <div className={styles.fileActions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              downloadJson(
                `franklins-gym-record-${fileDate(Date.now())}.json`,
                buildExport(attempts, Date.now()),
              )
            }
          >
            Export record
          </button>
          <ImportControl label="Import record" busy={busy} onFile={handleFile} />
        </div>
        {importStatus && (
          <p className={styles.importMessage} role={importStatus.role}>
            {importStatus.text}
          </p>
        )}
      </section>
    </section>
  );
}
