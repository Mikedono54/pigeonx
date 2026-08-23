# PigeonX mobile glossary

Every word a person reads in the app comes from this list. If a new screen
needs a word that is not here, add it here first.

The test that keeps this honest lives in `__tests__/copy.test.ts`.

## The rule

Write for a ten year old holding the phone.

- Short sentences. One idea per line.
- Active voice. Say "you".
- No adverbs. No marketing words.
- No em dashes or en dashes. A period works.
- Never show a code word, a number in Hz on a main screen, a hex color, or an id.

## Old word to new word

| Old word | Say this instead |
| --- | --- |
| profile | sound |
| deterrent, deterrence | bird sound, or "the sound" |
| session, run (noun) | what played |
| run (verb), start a session | play |
| output | plays on |
| device, emitter | speaker |
| PigeonX emitter, hardware | PigeonX speaker |
| simulated device | test speaker |
| zone | area |
| location | place |
| tone | steady sound |
| sweep | rising and falling sound |
| pulse | beeping sound |
| sample, recording | bird call |
| distress call | bird alarm call |
| predator call | hawk call, falcon call |
| frequency, Hz, kHz | pitch, shown as Low / High / Very high |
| volume | loudness |
| effective range, ceiling | Will this speaker play it? Yes / Partly / No |
| guests may hear | Some people can hear this |
| entitlement, gate, tier | plan |
| org, organization, account (the company) | business |
| member, org member, seat | teammate |
| invitation, invite token | invite, and the link you send |
| owner / manager / staff | Owner / Manager / Teammate |
| upgrade path, paywall | plans |
| sandbox | hidden from people. Developer only. |
| sandbox purchase toast | Test mode: plan set to Pro |
| notification | reminder |
| executor | who runs it |
| reminder action "Start now" | Play now |
| keep-awake | keep the screen on |
| enabled / disabled | On / Off |
| error, invalid, failed | That didn't work. Try again. |
| sync, queue, RPC, config, null | never shown |

## The words we do use

| Word | What it means |
| --- | --- |
| Sound | One thing PigeonX can play. |
| Play | What Start does. |
| Plays on | Which speaker the sound comes out of. |
| This phone | The phone in your hand. |
| Bluetooth speaker | A speaker you already paired in phone settings. |
| PigeonX speaker | Our hardware. It plays the highest pitches. Not out yet. |
| Test speaker | A pretend speaker so you can try the whole app. |
| Pitch | How high a sound is. Low, High or Very high. |
| Loudness | How loud it is. |
| Place | A building. |
| Area | One part of a building, like a roof or a patio. |
| Schedule | Days and times you want the sound to play. |
| Who runs it | This phone reminds me, or a PigeonX speaker runs it by itself. |
| Plan | Free, Pro or Business. |
| History | What played and when. |
| Business | The company a team works for. It owns the places. |
| Teammate | One person on your team. |
| Invite | The link you send someone so they join your team. |
| Speaker mode | This phone runs your times, screen on, until you leave it. |
| Signed in as | Which account this phone is using. |
| Delete my account | Takes the account away for good. Apple asks for this. |

## Numbers

Pitch is a word on every screen: Low, High, Very high.

`18 kHz` is allowed in one place only: a small mono line under a slider on the
Adjust sheet and in the make your own screen, where someone tuning a sound
wants the exact number. Nowhere else.

Cut-offs live in `pitchWord()` in `src/core/profiles.ts`.

## Speaker reach

The app never pretends a phone can play a 25 kHz sound. The Adjust sheet asks
"Will this speaker play it?" and answers with one word plus one sentence:

- Yes. This speaker plays the whole sound.
- Partly. Phone speakers play the low part. The top is lost.
- No. Phone speakers can't play sounds this high. Use a PigeonX speaker.

## Business words

A business owns places. A place is a building, an area is one part of it, a
speaker sits in an area. Everyone else on the business is a teammate, and you
add one by sending an invite.

Three things a teammate can be:

- Owner. Can do everything, including billing.
- Manager. Can add places, areas, speakers and times.
- Teammate. Can play a sound and see what played.

## The three honest facts

They live on Settings, under Help, and on the third welcome screen.

1. Phones cannot play the highest sounds. A PigeonX speaker can.
2. Some sounds are very high. Some people can hear them. We mark those.
3. Bird alarm calls work best. They are not quiet. Everyone nearby hears them.

## Code names that stay

The screens are clean. Some code identifiers still use the old words so the
data people already have on their phones keeps loading:

- `AudioProfile`, `SYSTEM_PROFILES`, `useProfiles`, `profileId`
- `OutputKind`, `effectiveForOutput`, `OUTPUT_CEILING_HZ`
- `SessionEntry`, `useSession`, `sessionRecorder`
- `Executor`, `zoneId`, `deviceId`
- the `/deterrent` route, kept as a redirect to Home so old links still work

None of them reach a screen. `SPEAKER_LABEL` and `SPEAKER_HINT` hold the words
people actually read.
