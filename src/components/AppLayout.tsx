import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

// Shared header, landmarks, and responsive container. Every screen renders
// inside this so the shell paints immediately.
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            Franklin's Gym
          </Link>
          <nav aria-label="Primary">
            <NavLink
              to="/library"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              Library
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              Ledger
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
