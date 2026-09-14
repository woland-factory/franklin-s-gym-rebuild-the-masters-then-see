import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

export function NotFound() {
  return (
    <section className={styles.wrap}>
      <h1 className={styles.title}>That page moved</h1>
      <p className={styles.message}>Head back to the library to pick a passage.</p>
      <Link to="/library" className="btn btn-primary">
        Go to the library
      </Link>
    </section>
  );
}
