import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Condense } from "./routes/Condense";
import { Home } from "./routes/Home";
import { Library } from "./routes/Library";
import { NotFound } from "./routes/NotFound";
import { ReconstructPlaceholder } from "./routes/ReconstructPlaceholder";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/condense/:attemptId" element={<Condense />} />
        <Route path="/reconstruct/:attemptId" element={<ReconstructPlaceholder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
