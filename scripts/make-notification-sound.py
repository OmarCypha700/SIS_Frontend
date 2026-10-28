"""
Generates public/sounds/notification.wav: an original, short two-note "pop" chime.

Run with any Python 3 (standard library only):
    python scripts/make-notification-sound.py

To use a different sound, replace public/sounds/notification.wav with any short WAV/MP3 file the
institution has the rights to (keep the file name, or change NOTIFICATION_SOUND in
lib/notification-sound.js).
"""
import math
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "public" / "sounds" / "notification.wav"

# (start seconds, frequency Hz, length seconds, loudness)
NOTES = [(0.0, 987.77, 0.16, 0.8), (0.085, 1479.98, 0.26, 0.7)]  # B5 then F#6: a bright rising fifth


def tone(t, freq, length, loudness):
    if t < 0 or t > length:
        return 0.0
    attack = min(t / 0.004, 1.0)                      # 4 ms attack: a soft click-free start
    decay = math.exp(-t / (length / 4.5))             # fast exponential decay
    pop = 1 + 0.12 * math.exp(-t / 0.012)             # pitch starts slightly high and drops: the "pop"
    phase = 2 * math.pi * freq * pop * t
    body = math.sin(phase) + 0.22 * math.sin(2 * phase) + 0.06 * math.sin(3 * phase)
    return loudness * attack * decay * body


def main():
    total = max(start + length for start, _, length, _ in NOTES) + 0.02
    samples = []
    for i in range(int(total * RATE)):
        t = i / RATE
        value = sum(tone(t - start, f, length, loud) for start, f, length, loud in NOTES) * 0.45
        samples.append(max(-1.0, min(1.0, value)))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(b"".join(struct.pack("<h", int(s * 32767)) for s in samples))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {total:.2f} s)")


if __name__ == "__main__":
    main()
