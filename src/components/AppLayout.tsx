import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

// Shared header, landmarks, and responsive container. Every screen renders
// inside this so the shell paints immediately.
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.shell}>
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            Franklin's Gym
          </Link>
          <nav aria-label="Primary">
            <Link to="/library" className={styles.navLink}>
              Library
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
