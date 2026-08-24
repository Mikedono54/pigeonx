# Bird sound sources and licenses

All four app assets are real bird recordings. They were trimmed where noted, converted to PCM WAV, mixed to mono, resampled to 44.1 kHz, encoded at 16-bit, given short edge fades, and peak-normalized to -1.0 dBFS.

## `distress_pigeon.wav`

- Recording: **Pigeons fighting** (sound 841)
- Recordist: Joseph SARDIN
- Source: https://bigsoundbank.com/pigeons-fighting-s0841.html
- License: **CC0 / public domain**
- Edit: extracted 13.80-16.60 seconds from the source to capture an agitated fighting bout rather than cooing; duration 2.800 seconds.

## `predator_hawk.wav`

- Recording: **Red-tailed Hawk (Buteo jamaicensis), XC71575**
- Recordist: Jonathon Jongsma
- Source: https://commons.wikimedia.org/wiki/File:Buteo_jamaicensis_-_Red-tailed_Hawk_-_XC71575.ogg
- License: **Creative Commons Attribution-ShareAlike 3.0 Unported**: https://creativecommons.org/licenses/by-sa/3.0/
- Edit: the complete 2.124-second call was converted from stereo Ogg to the app format.
- Required attribution: `Red-tailed Hawk (Buteo jamaicensis), recorded by Jonathon Jongsma, CC BY-SA 3.0; converted to mono WAV, edge-faded, and peak-normalized.`
- Share-alike notice: this derived audio clip is distributed under CC BY-SA 3.0.

## `predator_falcon.wav`

- Recording: **Raven and Peregrine Falcon**, Bryce Canyon National Park
- Credit / author: Bryce Canyon National Park / National Park Service
- Source: https://www.nps.gov/subjects/sound/sounds-peregrine-raven_bryce.htm
- License: **Public domain** as part of the NPS Sound Gallery: https://www.nps.gov/subjects/sound/gallery.htm
- Edit: extracted 9.20-10.55 seconds to isolate the final peregrine call; duration 1.350 seconds.

## `alarm_generic.wav`

- Recording: **Eurasian Jay #1** (sound 3453)
- Recordists: Joseph SARDIN and Axeline T.
- Source: https://bigsoundbank.com/eurasian-jay-1-s3453.html
- License: **CC0 / public domain**
- Edit: retained the complete jay call and padded the tail with silence to 1.050 seconds.

## Output verification

| File | Duration | Audio format | Peak |
|---|---:|---|---:|
| `distress_pigeon.wav` | 2.800 s | PCM s16le, mono, 44.1 kHz | -1.0 dBFS |
| `predator_hawk.wav` | 2.124 s | PCM s16le, mono, 44.1 kHz | -1.0 dBFS |
| `predator_falcon.wav` | 1.350 s | PCM s16le, mono, 44.1 kHz | -1.0 dBFS |
| `alarm_generic.wav` | 1.050 s | PCM s16le, mono, 44.1 kHz | -1.0 dBFS |
