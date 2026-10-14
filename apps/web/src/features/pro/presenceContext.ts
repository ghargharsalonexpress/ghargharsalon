import { createContext, useContext } from "react";
import type { PresenceDto, ProSelfDto } from "@brand/shared";

export interface PresenceControl {
  /** The professional's own profile (always loaded inside the pro layout). */
  me: ProSelfDto;
  presence: PresenceDto;
  /** Online, stale or busy: heartbeats are running. */
  online: boolean;
  /** Heartbeats failing (network): shown as "Reconnecting…". */
  reconnecting: boolean;
  pending: boolean;
  error: unknown;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

export const PresenceContext = createContext<PresenceControl | null>(null);

export function usePresence(): PresenceControl {
  const value = useContext(PresenceContext);
  if (!value) throw new Error("usePresence must be used inside <PresenceProvider>");
  return value;
}
