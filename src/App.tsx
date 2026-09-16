import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Align } from "./routes/Align";
import { Condense } from "./routes/Condense";
import { Home } from "./routes/Home";
import { Ledger } from "./routes/Ledger";
import { Library } from "./routes/Library";
import { NotFound } from "./routes/NotFound";
import { Reconstruct } from "./routes/Reconstruct";
import { WorkedExample } from "./routes/WorkedExample";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/condense/:attemptId" element={<Condense />} />
        <Route path="/reconstruct/:attemptId" element={<Reconstruct />} />
        <Route path="/align/:attemptId" element={<Align />} />
        <Route path="/example" element={<WorkedExample />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
