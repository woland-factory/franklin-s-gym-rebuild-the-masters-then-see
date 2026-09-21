import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

// In-voice error surface. States what happened and the next step. Never a stack
// trace or raw error code. It is always the top heading of the screen it fills,
// so its title is the page's single <h1>.
export function ErrorState({ title, message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <section className={styles.wrap} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}
