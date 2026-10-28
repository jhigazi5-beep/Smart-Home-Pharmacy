/**
 * Web Audio API synthesized alarm chime and urgent medical siren tone.
 * Works 100% offline without any external MP3 files.
 * Unlocks immediately inside sandboxed iframes and mobile web views.
 */

let audioCtx: AudioContext | null = null;
let isPlayingLoop = false;
let loopTimeoutId: any = null;
let keepAliveIntervalId: any = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Initializes and unlocks the Web Audio Context on user gesture
 */
export function initAudioContext(): AudioContext {
  return getAudioContext();
}

/**
 * Persistent silent Web Audio keep-alive tick
 * Prevents mobile browsers and iframe hosts from discarding the AudioContext
 */
export function startAudioKeepAlive(): void {
  if (keepAliveIntervalId) return;

  const keepAliveTick = () => {
    try {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch {}
  };

  keepAliveIntervalId = setInterval(keepAliveTick, 10000);
}

/**
 * Plays a single pleasant chime chord
 */
export function playChimeNote(freq: number, duration: number, startTime: number): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.error('Error playing chime note:', err);
  }
}

/**
 * Plays a 4-tone gentle medical alert chime
 */
export function playMedicalChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Melodic sequence: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    playChimeNote(523.25, 0.4, now);
    playChimeNote(659.25, 0.4, now + 0.15);
    playChimeNote(783.99, 0.4, now + 0.3);
    playChimeNote(1046.50, 0.8, now + 0.45);

    // Vibration feedback on supported mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch (err) {
    console.warn('Audio playback not permitted yet without user interaction:', err);
  }
}

/**
 * Plays a loud, unmissable alternating medical alert siren (880Hz <-> 660Hz)
 * Synthesized with high-priority gain and oscillating pulses
 */
export function playLoudMedicalSiren(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual-tone high-urgency medical beeps
    const tones = [
      { freq: 880, dur: 0.22, delay: 0 },
      { freq: 660, dur: 0.22, delay: 0.24 },
      { freq: 880, dur: 0.22, delay: 0.48 },
      { freq: 1100, dur: 0.35, delay: 0.72 },
    ];

    tones.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // Slightly richer harmonics for louder perceived volume
      osc.frequency.setValueAtTime(t.freq, now + t.delay);

      gain.gain.setValueAtTime(0, now + t.delay);
      gain.gain.linearRampToValueAtTime(0.35, now + t.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + t.delay + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.delay);
      osc.stop(now + t.delay + t.dur);
    });

    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 400]);
    }
  } catch (err) {
    console.warn('Siren playback error:', err);
  }
}

/**
 * Starts continuous alarm loop until explicitly stopped
 * Cycles the loud medical siren every 1.8 seconds
 */
export function startAlarmLoop(): void {
  if (isPlayingLoop) return;
  isPlayingLoop = true;

  const cycle = () => {
    if (!isPlayingLoop) return;
    playLoudMedicalSiren();
    loopTimeoutId = setTimeout(cycle, 1800);
  };

  cycle();
}

/**
 * Stops ongoing alarm loop
 */
export function stopAlarmLoop(): void {
  isPlayingLoop = false;
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId);
    loopTimeoutId = null;
  }
}
