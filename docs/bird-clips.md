# Bird sound clips to source

The app ships four stand-in sounds (synthesized) under `apps/mobile/assets/audio/`. Replace them with real recordings that allow commercial use. Keep the same file names so the app picks them up without code changes:

| File | What it should be | Length | Notes |
|---|---|---|---|
| `distress_pigeon.wav` | Pigeon distress / alarm call | 1 to 3 s | A pigeon in distress, not cooing |
| `predator_hawk.wav` | Red-tailed hawk scream | 1 to 3 s | The classic "kee-eeeee-arr" |
| `predator_falcon.wav` | Peregrine falcon call | 1 to 3 s | Sharp "kak-kak-kak" |
| `alarm_generic.wav` | Generic bird alarm chatter | 1 to 3 s | Starling or jay alarm works |

Format: WAV, mono, 44.1 kHz, 16-bit, trimmed, peak-normalized to about -1 dB. I can convert anything you drop in (mp3/ogg/flac) and trim it.

## Where to get clips that allow commercial use

1. Pixabay Sound Effects (Pixabay License: free for commercial use, no attribution)
   - Hawk: https://pixabay.com/sound-effects/search/hawk/
   - Falcon: https://pixabay.com/sound-effects/search/falcon/
   - Pigeon alarm: https://pixabay.com/sound-effects/search/pigeon/
   - Bird alarm: https://pixabay.com/sound-effects/search/bird%20alarm/
2. Freesound, filtered to CC0 (public domain) only
   - Hawk: https://freesound.org/search/?q=red+tailed+hawk&f=license:%22Creative+Commons+0%22
   - Falcon: https://freesound.org/search/?q=peregrine+falcon&f=license:%22Creative+Commons+0%22
   - Pigeon distress: https://freesound.org/search/?q=pigeon+distress&f=license:%22Creative+Commons+0%22
   - Bird alarm: https://freesound.org/search/?q=bird+alarm+call&f=license:%22Creative+Commons+0%22
   CC BY clips are also fine for commercial use if we credit the author in the app's Settings > About; avoid CC BY-NC and Sampling+.
3. Paid, cleanest rights for a company: Epidemic Sound, Soundsnap, or Pond5 (search "red-tailed hawk call", "peregrine falcon", "pigeon distress"). One-time licenses are usually $5 to $30 per clip.

Avoid: xeno-canto (mostly CC BY-NC, no commercial use), the Macaulay Library (license required), BBC Sound Effects (non-commercial license), and YouTube rips.

## How to hand them over
Drop the files into `~/pigeonx/apps/mobile/assets/audio/` (any format) and tell me; I'll convert, trim, normalize, update the "stand-in sound" labels, and rebuild.
