import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import type { AttemptRecord } from "../lib/db";
import { getAttempt } from "../lib/store";
import styles from "./ReconstructPlaceholder.module.css";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

// A thin seam so a ripe "Rebuild" button has a real destination. The rebuild
// writing surface and the alignment diff arrive in the next release. This
// screen never renders the passage sentences: the vault holds even here.
export function ReconstructPlaceholder() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let live = true;
    if (!attemptId) {
      setStatus("not-found");
      return;
    }
    getAttempt(attemptId)
      .then((a) => {
        if (!live) return;
        if (!a) {
          setStatus("not-found");
          return;
        }
        setAttempt(a);
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, [attemptId]);

  if (status === "loading") {
    return (
      <div className={styles.wrap}>
        <Skeleton lines={3} label="Loading your attempt" />
      </div>
    );
  }

  if (status === "not-found" || status === "error" || !attempt) {
    return (
      <ErrorState
        title="That attempt is not here"
        message="It may have been removed. Start a fresh one from your attempts."
        actionLabel="Back to your attempts"
        onAction={() => navigate("/")}
      />
    );
  }

  return (
    <section className={styles.wrap}>
      <h1 className={styles.title}>Rebuild</h1>
      <p className={styles.passage}>{attempt.passage.title}</p>
      <p className={styles.body}>Your hints are saved and ready. The rebuild step opens next.</p>
      <Link to="/" className="btn btn-primary">
        Back to your attempts
      </Link>
    </section>
  );
}
