import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import type { AttemptRecord, DelayType } from "../lib/db";
import { getAttempt, getSetting, saveHint, vaultAttempt } from "../lib/store";
import { FIRST_RUN_MICRO_DRILL_KEY } from "../lib/firstRun";
import { DEFAULT_DELAY, DELAY_PRESETS } from "../lib/delays";
import styles from "./Condense.module.css";

type LoadStatus = "loading" | "ready" | "not-found" | "error" | "vaulted";

const DELAY_ORDER: DelayType[] = ["standard", "micro"];

// Condense a passage one sentence at a time into short hints, then vault it.
// The vault guard is load-bearing: a vaulted attempt never shows a sentence.
export function Condense() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [index, setIndex] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [delay, setDelay] = useState<DelayType>(DEFAULT_DELAY);
  const [vaulting, setVaulting] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!attemptId) {
      setStatus("not-found");
      return;
    }
    getAttempt(attemptId)
      .then(async (a) => {
        if (!live) return;
        if (!a) {
          setStatus("not-found");
          return;
        }
        if (a.status === "vaulted") {
          setStatus("vaulted");
          return;
        }
        // The guided micro-drill attempt defaults to the short delay so the
        // first session can end in an alignment the same day. The chooser stays,
        // so any attempt can still be vaulted for the standard wait.
        const microDrillId = await getSetting<string>(FIRST_RUN_MICRO_DRILL_KEY);
        if (!live) return;
        if (microDrillId === a.id) setDelay("micro");
        setAttempt(a);
        setHints(a.hints);
        setIndex(Math.min(a.cursor, a.passage.sentences.length - 1));
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

  if (status === "vaulted") {
    return (
      <section className={styles.notice}>
        <h1 className={styles.noticeTitle}>This one is vaulted</h1>
        <p className={styles.noticeBody}>
          The original is put away until it is ripe. Check your attempts to see when it opens.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to your attempts
        </Link>
      </section>
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

  const sentences = attempt.passage.sentences;
  const total = sentences.length;
  const isLast = index === total - 1;

  function setHintAt(i: number, value: string) {
    setHints((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  async function persist(i: number) {
    if (!attempt) return;
    await saveHint(attempt.id, i, hints[i] ?? "");
  }

  async function goNext() {
    await persist(index);
    if (!isLast) setIndex(index + 1);
  }

  async function goBack() {
    await persist(index);
    if (index > 0) setIndex(index - 1);
  }

  async function finish() {
    await persist(index);
    setChoosing(true);
  }

  async function confirmVault() {
    if (!attempt || vaulting) return;
    setVaulting(true);
    setVaultError(null);
    try {
      await vaultAttempt(attempt.id, delay, Date.now());
      navigate("/");
    } catch {
      setVaultError("This device blocked the save. Allow storage, then try again.");
      setVaulting(false);
    }
  }

  if (choosing) {
    return (
      <section className={styles.wrap}>
        <h1 className={styles.title}>Choose when it opens</h1>
        <p className={styles.lede}>
          The original hides until the time you pick. Then you rebuild it from your hints.
        </p>
        <fieldset className={styles.chooser}>
          <legend className={styles.legend}>Open the vault</legend>
          {DELAY_ORDER.map((key) => (
            <label key={key} className={styles.delayOption}>
              <input
                type="radio"
                name="delay"
                value={key}
                checked={delay === key}
                onChange={() => setDelay(key)}
              />
              <span>{DELAY_PRESETS[key].label}</span>
            </label>
          ))}
        </fieldset>
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => setChoosing(false)}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmVault} disabled={vaulting}>
            {vaulting ? "Vaulting" : "Vault it"}
          </button>
        </div>
        {vaultError && (
          <p className={styles.vaultError} role="alert">
            {vaultError}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>{attempt.passage.title}</h1>
        <p className={styles.progress} aria-live="polite">
          Sentence {index + 1} of {total}
        </p>
      </header>

      <p className={styles.sentence}>{sentences[index]}</p>

      <label className={styles.label} htmlFor="hint">
        Your hint
      </label>
      <textarea
        id="hint"
        className={styles.hint}
        value={hints[index] ?? ""}
        onChange={(e) => setHintAt(index, e.target.value)}
        onBlur={() => persist(index)}
        rows={2}
        placeholder="A few words to trigger this sentence later"
      />

      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={goBack} disabled={index === 0}>
          Back
        </button>
        {isLast ? (
          <button type="button" className="btn btn-primary" onClick={finish}>
            Finish and vault
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}
