import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Home } from "./routes/Home";
import { Library } from "./routes/Library";
import { NotFound } from "./routes/NotFound";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
