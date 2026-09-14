import styles from "./Skeleton.module.css";

interface SkeletonProps {
  lines?: number;
  label?: string;
}

// Layout-holding placeholder for loading states. Announces itself to assistive
// tech and never leaves a blank region.
export function Skeleton({ lines = 3, label = "Loading" }: SkeletonProps) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div className={styles.block} aria-hidden="true" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={styles.line} aria-hidden="true" />
      ))}
    </div>
  );
}
