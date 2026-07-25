/**
 * Tiny WebAudio pixel-sound engine.
 * Generates short retro blips procedurally — no asset files needed.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Wave = 'square' | 'triangle' | 'sine' | 'sawtooth';

function blip(
  freq: number,
  duration: number,
  type: Wave = 'square',
  vol = 0.5,
  delay = 0,
  slideTo?: number
) {
  const ac = ensure();
  if (!ac || !master || !enabled) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  const t0 = ac.currentTime + delay;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sound = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  isEnabled() {
    return enabled;
  },
  resume() {
    ensure();
  },
  /** short tap for button hover/press */
  tap() {
    blip(660, 0.06, 'square', 0.4);
  },
  /** positive confirm */
  confirm() {
    blip(523, 0.08, 'square', 0.45);
    blip(784, 0.12, 'square', 0.45, 0.07);
  },
  /** coin collect */
  coin() {
    blip(988, 0.05, 'square', 0.4);
    blip(1319, 0.1, 'square', 0.4, 0.04);
  },
  /** metallic arcade coin dropping into a slot */
  coinDrop() {
    blip(1180, 0.05, 'triangle', 0.45);
    blip(880, 0.07, 'square', 0.3, 0.03);
    blip(150, 0.09, 'sine', 0.5, 0.02);
  },
  /** mascot jump */
  jump() {
    blip(330, 0.16, 'square', 0.4, 0, 660);
  },
  /** mascot land */
  land() {
    blip(180, 0.08, 'triangle', 0.4);
  },
  /** copy contract */
  copy() {
    blip(880, 0.05, 'square', 0.35);
    blip(1175, 0.09, 'square', 0.35, 0.05);
  },
  /** menu open */
  open() {
    blip(440, 0.08, 'triangle', 0.4, 0, 880);
  },
  /** error / nope */
  nope() {
    blip(220, 0.12, 'sawtooth', 0.3, 0, 110);
  },
  /** power-on chime */
  powerOn() {
    blip(523, 0.1, 'square', 0.4);
    blip(659, 0.1, 'square', 0.4, 0.1);
    blip(784, 0.18, 'square', 0.4, 0.2);
  },
  /** clean retro arcade confirmation PING (loading complete) */
  ping() {
    blip(1047, 0.05, 'sine', 0.5);
    blip(1568, 0.14, 'sine', 0.42, 0.03);
    blip(2093, 0.1, 'sine', 0.28, 0.06);
  },
};
