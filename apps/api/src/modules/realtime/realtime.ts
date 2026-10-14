import type { Server as HttpServer, IncomingMessage } from "node:http";
import { RT, RT_PATH } from "@brand/shared";
import type { RequestHandler } from "express";
import { Server, type Socket } from "socket.io";
import type { Config } from "../../config";
import type { Logger } from "../../logger";
import { Booking } from "../bookings/booking.model";
import { bookingEvents } from "../bookings/lifecycle";
import { User } from "../users/user.model";

/**
 * Socket.IO at /rt (plan C8). Events are hints: each says what changed, and clients fetch the
 * truth over REST, so a missed event costs a refresh, never a wrong state. Domain code calls
 * `realtime.*`; without an attached server (unit tests) the calls do nothing.
 */
let io: Server | null = null;

export const realtime = {
  toUser(userId: unknown, event: string, data: unknown): void {
    io?.to(`user:${String(userId)}`).emit(event, data);
  },
  toBooking(bookingId: unknown, event: string, data: unknown): void {
    io?.to(`booking:${String(bookingId)}`).emit(event, data);
  },
  toAdmins(event: string, data: unknown): void {
    io?.to("admin").emit(event, data);
  },
};

type SessionRequest = IncomingMessage & { session?: { userId?: string; role?: string } };

export function attachRealtime(server: HttpServer, { config, logger, sessionMiddleware }: { config: Config; logger: Logger; sessionMiddleware: RequestHandler }): Server {
  io = new Server(server, {
    path: RT_PATH,
    cors: { origin: config.webOrigins, credentials: true },
    // Phones on 4G drop connections often; reconnects are cheap, long polls are not.
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });
  // The same signed session cookie as REST: no tokens in the browser (ADR-0005).
  io.engine.use(sessionMiddleware);

  io.on("connection", (socket: Socket) => {
    const session = (socket.request as SessionRequest).session;
    // Listeners are added before any await: a client sends "booking:watch" the moment it
    // connects, and a message with no listener yet is dropped (the room would never be joined).
    const ready = (async () => {
      const user = session?.userId ? await User.findById(session.userId, { role: 1, status: 1 }).lean() : null;
      if (!user || user.status !== "active") {
        socket.disconnect(true);
        return null;
      }
      await socket.join(`user:${String(user._id)}`);
      if (user.role === "admin") await socket.join("admin");
      return user;
    })().catch((error: unknown) => {
      logger.warn({ err: error }, "real-time connection failed");
      socket.disconnect(true);
      return null;
    });

    // Watching a booking needs the same right as reading it over REST.
    socket.on("booking:watch", async (bookingId: unknown, ack?: (ok: boolean) => void) => {
      const user = await ready;
      if (!user || typeof bookingId !== "string" || !/^[a-f0-9]{24}$/.test(bookingId)) return ack?.(false);
      const booking = await Booking.findById(bookingId, { customerId: 1, professionalId: 1 }).lean();
      const allowed = booking && (user.role === "admin" || booking.customerId.equals(user._id) || booking.professionalId?.equals(user._id));
      if (allowed && socket.connected) await socket.join(`booking:${bookingId}`);
      ack?.(Boolean(allowed));
    });
    socket.on("booking:unwatch", (bookingId: unknown) => {
      if (typeof bookingId === "string") void socket.leave(`booking:${bookingId}`);
    });
  });

  bookingEvents.on("changed", (booking) => {
    const event = { bookingId: String(booking._id), status: booking.status, version: booking.version };
    realtime.toBooking(booking._id, RT.bookingUpdated, event);
    realtime.toUser(booking.customerId, RT.bookingUpdated, event);
    if (booking.professionalId) realtime.toUser(booking.professionalId, RT.bookingUpdated, event);
    realtime.toAdmins(RT.bookingUpdated, event);
  });

  logger.info({ path: RT_PATH }, "real-time attached");
  return io;
}

export async function closeRealtime(): Promise<void> {
  await io?.close();
  io = null;
}
