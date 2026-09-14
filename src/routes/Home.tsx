import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { HowItWorks } from "../components/HowItWorks";

// The dashboard. Before the first attempt exists it renders the designed empty
// state. A future "has attempts" branch slots in here without disturbing the
// empty path.
export function Home() {
  const [showExample, setShowExample] = useState(false);

  return (
    <>
      <EmptyState
        title="Train against the masters"
        description="Condense a great passage into hints. Days later, rebuild it from memory and see, sentence by sentence, what you kept and what you lost."
        primary={
          <Link to="/library" className="btn btn-primary">
            Browse passages
          </Link>
        }
        secondary={
          <button type="button" onClick={() => setShowExample(true)}>
            See an example
          </button>
        }
      />
      {showExample && <HowItWorks onClose={() => setShowExample(false)} />}
    </>
  );
}
