import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlignmentView } from "../components/AlignmentView";
import { getWorkedExample } from "../data/workedExample";
import styles from "./WorkedExample.module.css";

// The first-minute payoff: a real alignment, visible in one tap, with no
// database write and no delay. A sample rebuild of a seed passage is aligned
// by the same engine that grades a real attempt.
export function WorkedExample() {
  const example = useMemo(getWorkedExample, []);

  return (
    <section className={styles.wrap}>
      <p className={styles.intro}>A sample rebuild, aligned against the original.</p>
      <AlignmentView
        title={example.title}
        author={example.author}
        alignment={example.alignment}
      />
      <div className={styles.actions}>
        <Link to="/library" className="btn btn-primary">
          Browse passages
        </Link>
        <Link to="/" className={styles.home}>
          Back to your attempts
        </Link>
      </div>
    </section>
  );
}
