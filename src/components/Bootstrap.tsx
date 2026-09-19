import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "./AppLayout";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "./Skeleton";
import { openDb, resetDbConnection } from "../lib/db";
import { getConfig } from "../lib/config";
import { seedDemoAttempt } from "../lib/store";

interface BootstrapProps {
  children: ReactNode;
  /** Injectable for tests. Defaults to opening local persistence. */
  open?: () => Promise<unknown>;
}

type InitState = "loading" | "ready" | "error";

// Opens local persistence before showing interactive content. A failed open
// renders a designed, in-voice error with a retry instead of a blank page.
export function Bootstrap({ children, open = openDb }: BootstrapProps) {
  const [state, setState] = useState<InitState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState("loading");
    open()
      .then(async () => {
        if (getConfig().seedDemo) {
          try {
            await seedDemoAttempt(Date.now());
          } catch {
            // The demo seed is optional. A failure must not block the app.
          }
        }
        return active && setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (state === "error") {
    return (
      <AppLayout>
        <ErrorState
          title="This browser blocked local storage"
          message="Franklin's Gym keeps your work on this device. Check your privacy settings, then load it again."
          actionLabel="Try again"
          onAction={() => {
            resetDbConnection();
            setAttempt((n) => n + 1);
          }}
        />
      </AppLayout>
    );
  }

  if (state === "loading") {
    return (
      <AppLayout>
        <Skeleton lines={4} label="Loading your gym" />
      </AppLayout>
    );
  }

  return <>{children}</>;
}
