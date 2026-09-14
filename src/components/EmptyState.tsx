import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description: string;
  primary: ReactNode;
  secondary?: ReactNode;
}

// Reusable designed empty state. Says what the screen is for and shows one
// obvious primary action, with any secondary action visibly subordinate.
export function EmptyState({ title, description, primary, secondary }: EmptyStateProps) {
  return (
    <section className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <div className={styles.actions}>
        {primary}
        {secondary && <div className={styles.secondary}>{secondary}</div>}
      </div>
    </section>
  );
}
