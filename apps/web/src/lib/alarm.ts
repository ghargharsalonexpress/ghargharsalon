/**
 * In-app job alarm (plan C10): websites can't choose the notification sound, so while the panel
 * is open a job alert rings through Web Audio. Browsers only allow sound after a tap, so the
 * Online toggle calls unlockAlarm() first.
 */
let context: AudioContext | null = null;

export function unlockAlarm(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  context ??= new AudioContext();
  void context.resume().catch(() => undefined);
}

export const alarmUnlocked = (): boolean => context?.state === "running";

/** Rings a two-tone chime every 1.2 s until the returned function is called. */
export function playAlarm(): () => void {
  if (!context) return () => undefined;
  const audio = context;
  const ring = () => {
    const now = audio.currentTime;
    for (const [offset, frequency] of [
      [0, 880],
      [0.22, 1175],
    ] as const) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.22);
    }
  };
  ring();
  const timer = window.setInterval(ring, 1_200);
  if ("vibrate" in navigator) navigator.vibrate([400, 150, 400, 150, 400]);
  return () => {
    window.clearInterval(timer);
    if ("vibrate" in navigator) navigator.vibrate(0);
  };
}
