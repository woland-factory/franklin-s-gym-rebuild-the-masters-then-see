import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AlignmentView } from "../components/AlignmentView";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import type { AttemptRecord } from "../lib/db";
import { getAttempt } from "../lib/store";
import styles from "./Align.module.css";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

// The moment of truth: the saved alignment of a reconstructed attempt. The
// original text appears here for the first time, beside the rebuild. An
// attempt that has not been rebuilt is sent back to the reconstruct screen, so
// the vault holds.
export function Align() {
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
    return <Skeleton lines={6} label="Loading the alignment" />;
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

  if (!attempt.alignment) {
    return <Navigate to={`/reconstruct/${attempt.id}`} replace />;
  }

  return (
    <section>
      <AlignmentView
        title={attempt.passage.title}
        author={attempt.passage.author}
        alignment={attempt.alignment}
      />
      <p className={styles.back}>
        <Link to="/">Back to your attempts</Link>
      </p>
    </section>
  );
}
