import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { Bootstrap } from "./components/Bootstrap";
import { initAnalytics } from "./lib/analytics";
import { initObservability } from "./lib/observability";
import "./styles/global.css";

// Observability and analytics are optional and self-gating. Kicking them off
// here keeps them out of the render path.
void initObservability();
initAnalytics();

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <Bootstrap>
          <App />
        </Bootstrap>
      </BrowserRouter>
    </StrictMode>,
  );
}
