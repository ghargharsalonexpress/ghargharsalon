import { useEffect, useRef, useSyncExternalStore } from "react";
import { RT_PATH } from "@brand/shared";
import { io, type Socket } from "socket.io-client";

/**
 * One Socket.IO connection (plan C3, C8), opened while a live screen needs it (booking page,
 * professional panel, admin) and closed when none does. Events are hints to refetch; the REST
 * API stays the source of truth, so a missed event costs a refresh, never a wrong screen.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Status = "connected" | "connecting" | "offline";
let socket: Socket | null = null;
let users = 0;
let status: Status = "offline";
const listeners = new Set<() => void>();
const setStatus = (next: Status) => {
  status = next;
  listeners.forEach((listener) => listener());
};

function acquire(): Socket {
  users++;
  if (!socket) {
    socket = io(BASE_URL, { path: RT_PATH, withCredentials: true, transports: ["websocket", "polling"], reconnectionDelayMax: 10_000 });
    setStatus("connecting");
    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("connecting"));
    socket.io.on("reconnect_failed", () => setStatus("offline"));
  }
  return socket;
}

function release(): void {
  users = Math.max(0, users - 1);
  if (users === 0 && socket) {
    socket.disconnect();
    socket = null;
    setStatus("offline");
  }
}

/** "Reconnecting…" after 3 s without a connection (plan C3). */
export const useRealtimeStatus = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
    () => "offline" as Status,
  );

/**
 * Subscribes to real-time events while mounted. `onReconnect` runs after every reconnect so the
 * screen can refetch what it may have missed. `watchBookingId` joins that booking's room.
 */
export function useRealtime(handlers: Record<string, (data: never) => void>, { enabled = true, watchBookingId, onReconnect }: { enabled?: boolean; watchBookingId?: string; onReconnect?: () => void } = {}): void {
  const latest = useRef({ handlers, onReconnect });
  useEffect(() => {
    latest.current = { handlers, onReconnect };
  });

  const events = Object.keys(handlers).sort().join("|");
  useEffect(() => {
    if (!enabled) return;
    const connection = acquire();
    const bound = events
      .split("|")
      .filter(Boolean)
      .map((event) => {
        const handler = (data: unknown) => (latest.current.handlers[event] as ((value: unknown) => void) | undefined)?.(data);
        connection.on(event, handler);
        return [event, handler] as const;
      });
    let connectedBefore = connection.connected;
    const onConnect = () => {
      if (watchBookingId) connection.emit("booking:watch", watchBookingId);
      if (connectedBefore) latest.current.onReconnect?.();
      connectedBefore = true;
    };
    connection.on("connect", onConnect);
    if (connection.connected) onConnect();
    return () => {
      for (const [event, handler] of bound) connection.off(event, handler);
      connection.off("connect", onConnect);
      if (watchBookingId) connection.emit("booking:unwatch", watchBookingId);
      release();
    };
  }, [enabled, events, watchBookingId]);
}
