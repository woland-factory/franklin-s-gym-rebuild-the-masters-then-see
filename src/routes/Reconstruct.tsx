import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { MAX_SENTENCES, MAX_WORDS } from "../data/seedPassages.types";
import { alignSentences } from "../lib/align";
import { attemptState, ripeLabel } from "../lib/attempts";
import type { AttemptRecord } from "../lib/db";
import { segmentSentences } from "../lib/segment";
import { getAttempt, saveReconstruction } from "../lib/store";
import { totalWordCount } from "../lib/wordCount";
import styles from "./Reconstruct.module.css";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

// The rebuild screen. It shows the user's own hints and a writing surface,
// never the original: the vault holds until the alignment reveals it. On
// submit the rebuild is validated against the caps, segmented, aligned, and
// saved, then the app navigates to the alignment.
export function Reconstruct() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rebuild, setRebuild] = useState("");
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        <Skeleton lines={4} label="Loading your attempt" />
      </div>
    );
  }

  if (status === "not-found" || status === "error" || !attempt) {
    return (
      <ErrorState
        title="Start a fresh attempt"
        message="It may have been removed. Start a fresh one from your attempts."
        actionLabel="Back to your attempts"
        onAction={() => navigate("/")}
      />
    );
  }

  const state = attemptState(attempt, Date.now());

  if (state === "condensing") {
    return <Navigate to={`/condense/${attempt.id}`} replace />;
  }

  if (state === "reconstructed") {
    return <Navigate to={`/align/${attempt.id}`} replace />;
  }

  if (state === "vaulted") {
    return (
      <section className={styles.notice}>
        <h1 className={styles.noticeTitle}>This opens when it is ripe</h1>
        <p className={styles.noticeBody}>
          {attempt.vaultedUntil != null
            ? ripeLabel(attempt.vaultedUntil, Date.now())
            : "Vaulted"}
          . Your hints wait here until then.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to your attempts
        </Link>
      </section>
    );
  }

  async function submit() {
    if (!attempt || saving) return;
    const text = rebuild.trim();
    if (!text) return;
    const sentences = segmentSentences(text);
    if (sentences.length > MAX_SENTENCES) {
      setInlineMessage(`Keep it to ${MAX_SENTENCES} sentences.`);
      return;
    }
    if (totalWordCount(sentences) > MAX_WORDS) {
      setInlineMessage(`Keep your rebuild to ${MAX_WORDS} words.`);
      return;
    }
    setInlineMessage(null);
    setSaving(true);
    // Yield once so the "Aligning" label paints before the synchronous align
    // compute runs. The grid is tiny, so this keeps feedback within 100ms
    // without adding an artificial delay.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const alignment = alignSentences(attempt.passage.sentences, sentences);
      await saveReconstruction(attempt.id, text, alignment, Date.now());
      navigate(`/align/${attempt.id}`);
    } catch {
      setSaving(false);
      setInlineMessage("This device blocked the save. Allow storage, then try again.");
    }
  }

  const { title, author } = attempt.passage;

  return (
    <section className={styles.wrap}>
      <header>
        <h1 className={styles.title}>{title}</h1>
        {author && <p className={styles.meta}>{author}</p>}
      </header>

      <div>
        <h2 className={styles.hintsHeading}>Your hints</h2>
        <ol className={styles.hints}>
          {attempt.hints.map((hint, i) => (
            <li key={i} className={styles.hint}>
              {hint.trim() ? hint : <span className={styles.blank}>Blank</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.surface}>
        <label className={styles.label} htmlFor="rebuild">
          Your rebuild
        </label>
        <textarea
          id="rebuild"
          className={styles.textarea}
          value={rebuild}
          onChange={(e) => setRebuild(e.target.value)}
          rows={10}
          placeholder="Write the passage from your hints"
        />
        {inlineMessage && (
          <p className={styles.inlineMessage} role="alert">
            {inlineMessage}
          </p>
        )}
        <button
          type="button"
          className={`btn btn-primary ${styles.action}`}
          onClick={submit}
          disabled={rebuild.trim() === "" || saving}
        >
          {saving ? "Aligning" : "See alignment"}
        </button>
      </div>
    </section>
  );
}
