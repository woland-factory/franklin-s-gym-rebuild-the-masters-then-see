import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AttemptCard } from "../components/AttemptCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { HowItWorks } from "../components/HowItWorks";
import { Skeleton } from "../components/Skeleton";
import { attemptState } from "../lib/attempts";
import type { AttemptRecord } from "../lib/db";
import { listAttempts } from "../lib/store";
import styles from "./Home.module.css";

type LoadStatus = "loading" | "ready" | "error";

// The dashboard. It shows the designed empty state before the first attempt,
// and a pipeline of attempt cards once there are any. Ripe attempts sort to the
// top so the next thing to do is first.
export function Home() {
  const [showExample, setShowExample] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

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

  if (status === "loading") {
    return <Skeleton lines={4} label="Loading your attempts" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Your attempts did not load"
        message="Check your connection and try again."
        actionLabel="Try again"
        onAction={load}
      />
    );
  }

  if (attempts.length === 0) {
    return (
      <>
        <EmptyState
          title="Train against the masters"
          description="Condense a great passage into hints. Days later, rebuild it from memory and see, sentence by sentence, what you kept and what you lost."
          primary={
            <Link to="/library" className="btn btn-primary">
              Browse passages
            </Link>
          }
          secondary={
            <button type="button" onClick={() => setShowExample(true)}>
              See an example
            </button>
          }
        />
        {showExample && <HowItWorks onClose={() => setShowExample(false)} />}
      </>
    );
  }

  const now = Date.now();
  // Newest first, then float ripe attempts to the top. Capped so the list never
  // grows unbounded. Full paginated history arrives in a later release.
  const newestFirst = [...attempts].reverse();
  const ripe = newestFirst.filter((a) => attemptState(a, now) === "ripe");
  const rest = newestFirst.filter((a) => attemptState(a, now) !== "ripe");
  const ordered = [...ripe, ...rest].slice(0, 50);

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Your attempts</h1>
        <Link to="/library" className="btn btn-secondary">
          Browse passages
        </Link>
      </header>
      <ul className={styles.list}>
        {ordered.map((attempt) => (
          <li key={attempt.id}>
            <AttemptCard attempt={attempt} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
