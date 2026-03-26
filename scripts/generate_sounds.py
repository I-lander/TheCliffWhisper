"""
Sound Generator for The Cliff Whisperer
Generates all game audio using numpy + wave (no external deps beyond numpy).
Theme: dark, ethereal, haunting, hypnotic.
"""

import numpy as np
import wave
import struct
import os

SAMPLE_RATE = 44100
OUTPUT_SFX = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "audio", "sfx")
OUTPUT_MUSIC = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "audio", "music")


# ─── UTILS ────────────────────────────────────────────────────────────────────

def save_wav(filename, samples, subfolder="sfx"):
    """Save float samples [-1, 1] as 16-bit WAV."""
    out_dir = OUTPUT_SFX if subfolder == "sfx" else OUTPUT_MUSIC
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, filename)
    samples = np.clip(samples, -1, 1)
    int_samples = (samples * 32767).astype(np.int16)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(int_samples.tobytes())
    print(f"  ✓ {path} ({len(samples)/SAMPLE_RATE:.2f}s)")


def t(duration):
    """Time array."""
    return np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)


def sine(freq, duration, phase=0):
    return np.sin(2 * np.pi * freq * t(duration) + phase)


def square(freq, duration):
    return np.sign(np.sin(2 * np.pi * freq * t(duration)))


def sawtooth(freq, duration):
    return 2 * (freq * t(duration) % 1) - 1


def noise(duration):
    return np.random.uniform(-1, 1, int(SAMPLE_RATE * duration))


def envelope(samples, attack=0.01, decay=0.0, sustain=1.0, release=0.05):
    """ADSR envelope."""
    n = len(samples)
    env = np.ones(n)
    a = int(attack * SAMPLE_RATE)
    d = int(decay * SAMPLE_RATE)
    r = int(release * SAMPLE_RATE)
    # Attack
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    # Decay
    if d > 0 and a + d < n:
        env[a:a+d] = np.linspace(1, sustain, d)
    # Sustain
    if a + d < n - r:
        env[a+d:n-r] = sustain
    # Release
    if r > 0:
        env[n-r:] = np.linspace(sustain, 0, r)
    return samples * env


def fade_in(samples, duration=0.05):
    n = int(duration * SAMPLE_RATE)
    samples[:n] *= np.linspace(0, 1, n)
    return samples


def fade_out(samples, duration=0.05):
    n = int(duration * SAMPLE_RATE)
    samples[-n:] *= np.linspace(1, 0, n)
    return samples


def reverb(samples, delay_ms=80, decay=0.3, repeats=4):
    """Simple comb-filter reverb."""
    out = samples.copy()
    delay_samples = int(delay_ms * SAMPLE_RATE / 1000)
    for i in range(1, repeats + 1):
        offset = delay_samples * i
        gain = decay ** i
        if offset < len(out):
            end = min(len(out), len(samples) + offset)
            src_end = end - offset
            out[offset:end] += samples[:src_end] * gain
    return np.clip(out, -1, 1)


def pitch_sweep(start_freq, end_freq, duration):
    """Frequency sweep (linear)."""
    tt = t(duration)
    freqs = np.linspace(start_freq, end_freq, len(tt))
    phase = 2 * np.pi * np.cumsum(freqs) / SAMPLE_RATE
    return np.sin(phase)


def mix(*signals, levels=None):
    """Mix multiple signals of same length."""
    if levels is None:
        levels = [1.0 / len(signals)] * len(signals)
    out = np.zeros(len(signals[0]))
    for s, l in zip(signals, levels):
        out[:len(s)] += s[:len(out)] * l
    return np.clip(out, -1, 1)


def pad_to(samples, duration):
    """Pad or trim to exact duration."""
    n = int(SAMPLE_RATE * duration)
    if len(samples) >= n:
        return samples[:n]
    return np.concatenate([samples, np.zeros(n - len(samples))])


def concat(*parts):
    """Concatenate audio segments."""
    return np.concatenate(parts)


def lowpass_simple(samples, cutoff_ratio=0.1):
    """Very simple lowpass via moving average."""
    n = max(1, int(1 / cutoff_ratio))
    kernel = np.ones(n) / n
    return np.convolve(samples, kernel, mode='same')


# ─── SFX: HUMAN ACTIONS ──────────────────────────────────────────────────────

def gen_human_spawn():
    """Ethereal whoosh when human is summoned."""
    dur = 0.4
    # Rising tone
    s = pitch_sweep(150, 600, dur) * 0.4
    # Breathy noise layer
    n = noise(dur) * 0.15
    n = lowpass_simple(n, 0.05)
    out = envelope(s + n, attack=0.02, release=0.15)
    save_wav("human_spawn.wav", reverb(out, 60, 0.25))


def gen_human_jump():
    """Upward whoosh + impact when human leaps off cliff."""
    dur = 0.5
    # Upward sweep
    sweep = pitch_sweep(200, 800, 0.3) * 0.5
    sweep = envelope(sweep, attack=0.01, release=0.1)
    # Impact thud
    thud = sine(60, 0.2) * 0.6
    thud = envelope(thud, attack=0.005, decay=0.05, sustain=0.2, release=0.1)
    out = pad_to(sweep, dur) + pad_to(thud, dur) * 0.5
    # Add airy noise
    n = envelope(noise(dur) * 0.1, attack=0.05, release=0.2)
    n = lowpass_simple(n, 0.08)
    save_wav("human_jump.wav", reverb(out + n, 50, 0.2))


def gen_human_fall():
    """Descending whistle as human falls."""
    dur = 0.8
    sweep = pitch_sweep(700, 100, dur) * 0.35
    # Wind noise
    n = noise(dur) * 0.2
    n = lowpass_simple(n, 0.06)
    out = envelope(sweep + n, attack=0.02, release=0.3)
    save_wav("human_fall.wav", reverb(out, 100, 0.3))


def gen_human_turnback():
    """Disappointed descending tone when human turns back."""
    dur = 0.4
    s = pitch_sweep(500, 200, dur) * 0.3
    # Minor second dissonance
    s2 = pitch_sweep(530, 212, dur) * 0.15
    out = envelope(s + s2, attack=0.02, release=0.15)
    save_wav("human_turnback.wav", reverb(out, 40, 0.2))


def gen_soul_rise():
    """Ethereal shimmer as soul ascends."""
    dur = 1.0
    # High ethereal tones
    s1 = sine(1200, dur) * 0.15
    s2 = sine(1510, dur) * 0.1
    s3 = sine(1800, dur) * 0.08
    # Shimmer via AM modulation
    mod = 0.5 + 0.5 * sine(6, dur)
    out = (s1 + s2 + s3) * mod
    out = envelope(out, attack=0.1, decay=0.2, sustain=0.6, release=0.4)
    save_wav("soul_rise.wav", reverb(out, 120, 0.4, 6))


# ─── SFX: ABILITIES ──────────────────────────────────────────────────────────

def gen_ability_frenzy():
    """Frenzy Pulse — energetic pulse, adrenaline rush."""
    dur = 0.7
    # Fast pulsing bass
    pulse = sine(80, dur) * (0.5 + 0.5 * square(8, dur)) * 0.4
    # Rising energy
    sweep = pitch_sweep(300, 1200, dur) * 0.25
    out = envelope(pulse + sweep, attack=0.02, decay=0.1, sustain=0.7, release=0.2)
    save_wav("ability_frenzy.wav", reverb(out, 40, 0.2))


def gen_ability_void():
    """Void Call — dark void energy activation."""
    dur = 0.8
    # Deep sub bass
    bass = sine(40, dur) * 0.5
    # Eerie overtone
    eerie = sine(440, dur) * 0.15 * (0.5 + 0.5 * sine(3, dur))
    # Noise swell
    n = noise(dur) * 0.2
    n = lowpass_simple(n, 0.03)
    out = envelope(bass + eerie + n, attack=0.05, decay=0.2, sustain=0.6, release=0.3)
    save_wav("ability_void.wav", reverb(out, 100, 0.35, 5))


def gen_ability_darkwave():
    """Dark Wave — mass summoning, deep boom."""
    dur = 0.6
    # Deep boom
    boom = pitch_sweep(120, 30, 0.3) * 0.6
    boom = envelope(boom, attack=0.005, release=0.2)
    # Scatter of high pings (multiple humans)
    pings = np.zeros(int(SAMPLE_RATE * dur))
    for i in range(5):
        offset = int(i * 0.08 * SAMPLE_RATE)
        freq = 600 + i * 150
        ping = envelope(sine(freq, 0.15) * 0.15, attack=0.005, release=0.1)
        end = min(offset + len(ping), len(pings))
        pings[offset:end] += ping[:end - offset]
    out = pad_to(boom, dur) + pings
    save_wav("ability_darkwave.wav", reverb(out, 60, 0.25))


def gen_ability_harvest():
    """Soul Harvest — mystical power-up shimmer."""
    dur = 0.8
    # Ascending arpeggiated tones
    notes = [440, 554, 659, 880]
    out = np.zeros(int(SAMPLE_RATE * dur))
    for i, freq in enumerate(notes):
        offset = int(i * 0.15 * SAMPLE_RATE)
        note = envelope(sine(freq, 0.4) * 0.2, attack=0.01, release=0.2)
        end = min(offset + len(note), len(out))
        out[offset:end] += note[:end - offset]
    # Shimmer overlay
    shimmer = sine(1760, dur) * 0.08 * (0.5 + 0.5 * sine(5, dur))
    shimmer = envelope(shimmer, attack=0.2, release=0.3)
    out += shimmer
    save_wav("ability_harvest.wav", reverb(out, 80, 0.3, 5))


def gen_ability_silence():
    """Silence — eerie void, deafening quiet."""
    dur = 1.0
    # Reverse-style swell that cuts to almost nothing
    n = noise(dur) * 0.3
    n = lowpass_simple(n, 0.02)
    # Envelope: swell then abrupt cut
    env = np.zeros(len(n))
    swell = int(0.4 * SAMPLE_RATE)
    env[:swell] = np.linspace(0, 1, swell)
    env[swell:swell+500] = np.linspace(1, 0, 500)
    # Very quiet residual hum
    hum = sine(60, dur) * 0.05
    hum = envelope(hum, attack=0.4, release=0.3)
    out = n * env + hum
    save_wav("ability_silence.wav", reverb(out, 150, 0.4, 6))


# ─── SFX: PHASE TRANSITIONS ──────────────────────────────────────────────────

def gen_phase_night():
    """Transition to night — mysterious descending wash."""
    dur = 2.0
    # Descending pad
    sweep = pitch_sweep(600, 150, dur) * 0.25
    # Dark pad
    pad = sine(110, dur) * 0.2 + sine(165, dur) * 0.1
    pad = envelope(pad, attack=0.3, release=0.5)
    # Cricket-like high tone
    cricket = sine(4000, dur) * 0.03 * (0.5 + 0.5 * square(3, dur))
    cricket = envelope(cricket, attack=0.5, release=0.5)
    out = envelope(sweep, attack=0.1, release=0.8) + pad + cricket
    save_wav("phase_night.wav", reverb(out, 120, 0.35, 5))


def gen_phase_day():
    """Transition to daytime — ominous rising drone."""
    dur = 2.0
    # Rising drone
    sweep = pitch_sweep(100, 400, dur) * 0.2
    # Bright overtone
    bright = sine(800, dur) * 0.1
    bright = envelope(bright, attack=0.5, release=0.5)
    # Wind noise swell
    n = noise(dur) * 0.15
    n = lowpass_simple(n, 0.04)
    n = envelope(n, attack=0.3, release=0.6)
    out = envelope(sweep, attack=0.2, release=0.5) + bright + n
    save_wav("phase_day.wav", reverb(out, 80, 0.3))


def gen_phase_sunset():
    """Sunset transition — brief melancholic wash."""
    dur = 1.5
    # Warm descending chord
    s1 = sine(330, dur) * 0.2  # E4
    s2 = sine(392, dur) * 0.15  # G4
    s3 = sine(494, dur) * 0.1  # B4
    chord = s1 + s2 + s3
    chord = envelope(chord, attack=0.2, decay=0.3, sustain=0.5, release=0.5)
    save_wav("phase_sunset.wav", reverb(chord, 100, 0.35, 5))


# ─── SFX: SKILL TREE ─────────────────────────────────────────────────────────

def gen_node_hover():
    """Subtle ping on skill node hover."""
    dur = 0.15
    s = sine(1200, dur) * 0.2
    out = envelope(s, attack=0.005, release=0.1)
    save_wav("node_hover.wav", out)


def gen_node_unlock():
    """Satisfying magical resonance on skill unlock."""
    dur = 0.6
    # Base chime
    s1 = sine(880, dur) * 0.25
    s2 = sine(1320, dur) * 0.15  # Perfect fifth
    s3 = sine(1760, dur) * 0.1   # Octave
    chime = s1 + s2 + s3
    chime = envelope(chime, attack=0.01, decay=0.1, sustain=0.6, release=0.3)
    # Sparkle
    sparkle = sine(3520, 0.3) * 0.08
    sparkle = envelope(sparkle, attack=0.01, release=0.2)
    out = pad_to(chime, dur)
    out[:len(sparkle)] += sparkle
    save_wav("node_unlock.wav", reverb(out, 60, 0.25))


def gen_node_locked():
    """Dull thud when clicking locked node."""
    dur = 0.2
    s = sine(150, dur) * 0.3
    out = envelope(s, attack=0.005, decay=0.05, sustain=0.2, release=0.1)
    save_wav("node_locked.wav", out)


# ─── SFX: UI ─────────────────────────────────────────────────────────────────

def gen_ui_click():
    """Generic button click."""
    dur = 0.1
    s = sine(800, dur) * 0.25
    out = envelope(s, attack=0.005, release=0.06)
    save_wav("ui_click.wav", out)


def gen_ui_hover():
    """Subtle hover sound."""
    dur = 0.08
    s = sine(1000, dur) * 0.12
    out = envelope(s, attack=0.005, release=0.05)
    save_wav("ui_hover.wav", out)


def gen_ui_confirm():
    """Confirmation sound (ascending two-note)."""
    dur = 0.3
    n1 = envelope(sine(600, 0.12) * 0.25, attack=0.005, release=0.05)
    n2 = envelope(sine(900, 0.15) * 0.25, attack=0.005, release=0.08)
    out = concat(n1, n2)
    save_wav("ui_confirm.wav", out)


def gen_ui_cancel():
    """Cancel / back sound (descending two-note)."""
    dur = 0.3
    n1 = envelope(sine(600, 0.12) * 0.25, attack=0.005, release=0.05)
    n2 = envelope(sine(400, 0.15) * 0.25, attack=0.005, release=0.08)
    out = concat(n1, n2)
    save_wav("ui_cancel.wav", out)


def gen_save_confirm():
    """Save confirmation chime."""
    dur = 0.5
    n1 = envelope(sine(700, 0.15) * 0.2, attack=0.01, release=0.08)
    n2 = envelope(sine(880, 0.15) * 0.2, attack=0.01, release=0.08)
    n3 = envelope(sine(1050, 0.2) * 0.2, attack=0.01, release=0.12)
    out = concat(n1, n2, n3)
    save_wav("save_confirm.wav", reverb(out, 50, 0.2))


# ─── SFX: DECORATIONS ────────────────────────────────────────────────────────

def gen_deco_house():
    """House placement — domestic wooden creak."""
    dur = 0.4
    # Woody thud
    thud = sine(180, 0.15) * 0.4
    thud = envelope(thud, attack=0.005, release=0.1)
    # Creak
    creak = pitch_sweep(300, 500, 0.25) * 0.15
    creak = envelope(creak, attack=0.02, release=0.1)
    out = concat(thud, creak)
    save_wav("deco_house.wav", out)


def gen_deco_church():
    """Church placement — bell toll."""
    dur = 0.8
    # Bell-like tone (fundamental + inharmonic partials)
    s1 = sine(440, dur) * 0.3
    s2 = sine(880, dur) * 0.15
    s3 = sine(1244, dur) * 0.08  # Slightly inharmonic
    bell = s1 + s2 + s3
    out = envelope(bell, attack=0.005, decay=0.2, sustain=0.4, release=0.4)
    save_wav("deco_church.wav", reverb(out, 100, 0.35, 5))


def gen_deco_lighthouse():
    """Lighthouse placement — foghorn."""
    dur = 0.8
    # Low foghorn
    horn = sine(110, dur) * 0.35 + sine(165, dur) * 0.15
    out = envelope(horn, attack=0.1, decay=0.1, sustain=0.7, release=0.3)
    save_wav("deco_lighthouse.wav", reverb(out, 80, 0.3))


def gen_deco_tree():
    """Tree placement — rustling leaves."""
    dur = 0.5
    # Filtered noise = rustling
    n = noise(dur) * 0.25
    n = lowpass_simple(n, 0.08)
    # Soft tone
    tone = sine(250, dur) * 0.08
    out = envelope(n + tone, attack=0.05, release=0.2)
    save_wav("deco_tree.wav", out)


def gen_deco_tombstone():
    """Tombstone placement — eerie low tone."""
    dur = 0.6
    # Dark tone
    s = sine(100, dur) * 0.3
    # Dissonant overtone
    s2 = sine(106, dur) * 0.15  # Beating effect
    n = noise(dur) * 0.05
    n = lowpass_simple(n, 0.02)
    out = envelope(s + s2 + n, attack=0.03, release=0.3)
    save_wav("deco_tombstone.wav", reverb(out, 120, 0.4, 5))


def gen_deco_wall():
    """Wall placement — heavy stone thud."""
    dur = 0.35
    # Impact
    impact = sine(60, 0.15) * 0.5
    impact = envelope(impact, attack=0.002, release=0.1)
    # Stone scrape (noise)
    scrape = noise(0.2) * 0.15
    scrape = lowpass_simple(scrape, 0.04)
    scrape = envelope(scrape, attack=0.01, release=0.1)
    out = concat(impact, scrape)
    save_wav("deco_wall.wav", out)


# ─── SFX: GAME EVENTS ────────────────────────────────────────────────────────

def gen_victory():
    """Victory — The silence. Haunting final chord."""
    dur = 3.0
    # Ethereal ascending chord resolving to silence
    s1 = sine(220, dur) * 0.2   # A3
    s2 = sine(330, dur) * 0.15  # E4
    s3 = sine(440, dur) * 0.12  # A4
    s4 = sine(554, dur) * 0.08  # C#5
    chord = s1 + s2 + s3 + s4
    # Swell and fade
    env = np.ones(len(chord))
    swell = int(1.0 * SAMPLE_RATE)
    env[:swell] = np.linspace(0, 1, swell)
    env[swell:] = np.linspace(1, 0, len(env) - swell)
    out = chord * env
    # Whisper-like noise
    whisper = noise(dur) * 0.04
    whisper = lowpass_simple(whisper, 0.02)
    whisper = envelope(whisper, attack=0.5, release=1.0)
    save_wav("victory.wav", reverb(out + whisper, 150, 0.4, 8))


def gen_defeat():
    """Defeat — They endure. Heavy, oppressive."""
    dur = 3.0
    # Descending dissonant chord
    s1 = pitch_sweep(220, 110, dur) * 0.2
    s2 = pitch_sweep(233, 117, dur) * 0.15  # Minor second beating
    s3 = sine(55, dur) * 0.25
    chord = s1 + s2 + s3
    # Noise swell
    n = noise(dur) * 0.1
    n = lowpass_simple(n, 0.02)
    n = envelope(n, attack=0.3, release=0.8)
    out = envelope(chord, attack=0.2, release=1.0) + n
    save_wav("defeat.wav", reverb(out, 120, 0.35, 6))


def gen_population_birth():
    """New humans born at sunset."""
    dur = 0.5
    # Soft ascending tones
    s1 = envelope(sine(300, 0.2) * 0.15, attack=0.01, release=0.1)
    s2 = envelope(sine(400, 0.2) * 0.15, attack=0.01, release=0.1)
    gap = np.zeros(int(0.05 * SAMPLE_RATE))
    out = concat(s1, gap, s2)
    save_wav("population_birth.wav", reverb(out, 60, 0.2))


# ─── AMBIENCE / MUSIC ────────────────────────────────────────────────────────

def gen_ambience_night():
    """Night phase ambient loop — dark, ethereal, crickets, wind. 15s loop."""
    dur = 15.0
    tt = t(dur)

    # Deep drone
    drone = sine(55, dur) * 0.12 + sine(82.5, dur) * 0.06
    # Slow modulation
    drone *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.1 * tt)

    # Wind (filtered noise with slow volume modulation)
    wind = noise(dur) * 0.08
    wind = lowpass_simple(wind, 0.02)
    wind *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.15 * tt)

    # Cricket-like chirps (high freq pulses)
    cricket = sine(4200, dur) * 0.02
    cricket_gate = np.zeros(len(tt))
    # Create intermittent chirps
    for i in range(int(dur * 2)):
        start = int((i * 0.5 + np.random.uniform(0, 0.2)) * SAMPLE_RATE)
        chirp_len = int(0.08 * SAMPLE_RATE)
        if start + chirp_len < len(cricket_gate):
            cricket_gate[start:start + chirp_len] = 1
    cricket *= cricket_gate

    # Ethereal pad (very quiet high harmonics)
    pad = sine(440, dur) * 0.03 + sine(660, dur) * 0.02
    pad *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * tt)

    out = drone + wind + cricket + pad
    out = fade_in(out, 0.5)
    out = fade_out(out, 0.5)
    save_wav("ambience_night.wav", out, "music")


def gen_ambience_day():
    """Daytime ambient loop — cliff wind, tension. 15s loop."""
    dur = 15.0
    tt = t(dur)

    # Wind (stronger than night)
    wind = noise(dur) * 0.12
    wind = lowpass_simple(wind, 0.03)
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.12 * tt)

    # Tension drone
    drone = sine(110, dur) * 0.08 + sine(147, dur) * 0.05
    drone *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.08 * tt)

    # Occasional distant rumble
    rumble = sine(40, dur) * 0.06
    rumble_mod = np.zeros(len(tt))
    for i in range(3):
        center = int((2 + i * 4.5) * SAMPLE_RATE)
        width = int(1.5 * SAMPLE_RATE)
        start = max(0, center - width // 2)
        end = min(len(rumble_mod), center + width // 2)
        rumble_mod[start:end] = np.hanning(end - start)
    rumble *= rumble_mod

    out = wind + drone + rumble
    out = fade_in(out, 0.5)
    out = fade_out(out, 0.5)
    save_wav("ambience_day.wav", out, "music")


def gen_menu_theme():
    """Main menu ambient theme — haunting, hypnotic. 20s loop."""
    dur = 20.0
    tt = t(dur)

    # Haunting pad (Am chord voiced wide)
    s_a = sine(110, dur) * 0.1    # A2
    s_e = sine(164.8, dur) * 0.07  # E3
    s_c = sine(261.6, dur) * 0.06  # C4
    s_a2 = sine(440, dur) * 0.04   # A4
    pad = s_a + s_e + s_c + s_a2
    # Slow breathe modulation
    pad *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * tt)

    # Wind layer
    wind = noise(dur) * 0.06
    wind = lowpass_simple(wind, 0.02)
    wind *= 0.4 + 0.6 * np.sin(2 * np.pi * 0.08 * tt + 1.0)

    # Melodic motif — simple 4-note pattern repeated
    motif_notes = [440, 523.25, 493.88, 392]  # A4, C5, B4, G4
    motif = np.zeros(int(SAMPLE_RATE * dur))
    for repeat in range(3):
        for i, freq in enumerate(motif_notes):
            offset = int((repeat * 6 + 2 + i * 1.2) * SAMPLE_RATE)
            note = envelope(sine(freq, 1.0) * 0.06, attack=0.05, decay=0.2, sustain=0.4, release=0.5)
            end = min(offset + len(note), len(motif))
            if offset < len(motif):
                motif[offset:end] += note[:end - offset]

    out = pad + wind + motif
    out = fade_in(out, 1.0)
    out = fade_out(out, 1.5)
    save_wav("menu_theme.wav", reverb(out, 150, 0.35, 6), "music")


# ─── SFX: CLICK FEEDBACK ─────────────────────────────────────────────────────

def gen_click_spawn():
    """Player click to spawn human — tactile click + ethereal tail."""
    dur = 0.25
    # Click transient
    click = sine(1000, 0.02) * 0.4
    click = envelope(click, attack=0.001, release=0.015)
    # Ethereal tail
    tail = sine(600, 0.2) * 0.15
    tail = envelope(tail, attack=0.01, release=0.15)
    out = pad_to(click, dur) + pad_to(tail, dur)
    save_wav("click_spawn.wav", out)


def gen_cooldown_ready():
    """Cooldown finished — subtle ready ping."""
    dur = 0.2
    s = sine(1400, dur) * 0.15
    out = envelope(s, attack=0.005, release=0.12)
    save_wav("cooldown_ready.wav", out)


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🎵 Generating sounds for The Cliff Whisperer...\n")

    print("── Human Actions ──")
    gen_human_spawn()
    gen_human_jump()
    gen_human_fall()
    gen_human_turnback()
    gen_soul_rise()

    print("\n── Abilities ──")
    gen_ability_frenzy()
    gen_ability_void()
    gen_ability_darkwave()
    gen_ability_harvest()
    gen_ability_silence()

    print("\n── Phase Transitions ──")
    gen_phase_night()
    gen_phase_day()
    gen_phase_sunset()

    print("\n── Skill Tree ──")
    gen_node_hover()
    gen_node_unlock()
    gen_node_locked()

    print("\n── UI ──")
    gen_ui_click()
    gen_ui_hover()
    gen_ui_confirm()
    gen_ui_cancel()
    gen_save_confirm()
    gen_click_spawn()
    gen_cooldown_ready()

    print("\n── Decorations ──")
    gen_deco_house()
    gen_deco_church()
    gen_deco_lighthouse()
    gen_deco_tree()
    gen_deco_tombstone()
    gen_deco_wall()

    print("\n── Game Events ──")
    gen_victory()
    gen_defeat()
    gen_population_birth()

    print("\n── Ambience / Music ──")
    gen_ambience_night()
    gen_ambience_day()
    gen_menu_theme()

    print("\n✅ All sounds generated!")
