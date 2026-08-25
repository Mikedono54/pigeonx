# PigeonX mobile glossary

Every word a person reads in the app comes from this list. If a new screen
needs a word that is not here, add it here first.

The test that keeps this honest lives in `__tests__/copy.test.ts`.

## The rule

Clear, specific, professional. Write for the person who bought a tool to solve
a bird problem, not for a child.

- Say the precise thing. "Steady 18 kHz tone" beats "steady high sound".
- Short sentences. One idea per line.
- One line of helper text per screen, and never two.
- A row gets a name and at most three words under it. If the name or the
  drawing already says it, say nothing.
- A sound is described in six words or fewer.
- Active voice. Say "you".
- No adverbs. No marketing words.
- No em dashes or en dashes. A period works.
- Never show a code word, a hex colour, or an id.
- Never number a section for the reader. No "01 STATE", no "02 HOW LONG". A
  section is named in small caps or it carries no label at all.

The words below are the ones we settled on. The left column is still wrong,
but it is wrong because it is vague or because it names something inside the
app, not because it is long.

## Old word to new word

| Old word | Say this instead |
| --- | --- |
| profile | sound |
| deterrence, the deterrent (the app) | the sound, or PigeonX |
| output | plays on |
| device, emitter | speaker |
| PigeonX emitter, hardware | PigeonX speaker |
| simulated device | test speaker |
| zone | area |
| location (one building) | place |
| location (a business with many) | locations, as in "multiple locations" |
| sample, recording | bird call, or the recording |
| guests may hear, people can hear it | Audible |
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
| Deterrent | A sound built to move birds on. Used in a sound's name. |
| Distress call | A real recording of a bird in trouble. Well studied, and audible. |
| Predictability | A pattern a bird can learn. What randomised timing makes harder. |
| Session | One run of a sound, from Start to Stop. |
| Play | What Start does. |
| Plays on | Which speaker the sound comes out of. |
| This phone | The phone in your hand. |
| Bluetooth speaker | A speaker you already paired in phone settings. |
| PigeonX speaker | Our hardware. It reaches the highest frequencies. Not out yet. |
| Test speaker | A pretend speaker so you can try the whole app. |
| Pitch | How high a sound is, said as the number: 18 kHz, 15 to 19 kHz. |
| Loudness | How loud it is. |
| Audible | This sound sits inside human hearing. People nearby will hear it. |
| May be audible | 15 to 20 kHz. Phones and ears both vary up there. |
| Typically inaudible | 22 kHz, out of a PigeonX speaker. Most people hear nothing. |
| Natural recording | A real bird, recorded by somebody we credit. |
| Generated tone | Made by the app, not recorded. |
| Place | A building. |
| Area | One part of a building, like a roof or a patio. |
| Schedule | Days and times you want the sound to play. |
| Who runs it | This phone reminds me, or Speaker mode runs it on its own. |
| Plan | Free, Pro or Business. |
| History | What played and when. |
| Business | The company a team works for. It owns the places. |
| Teammate | One person on your team. |
| Invite | The link you send someone so they join your team. |
| Speaker mode | This phone runs your times, screen on, until you leave it. |
| Signed in as | Which account this phone is using. |
| Delete my account | Takes the account away for good. Apple asks for this. |

## The sounds

The nine built-in sounds, exactly as they read. The ids never change, because
a sound someone already picked has to keep loading.

| Name | Under it |
| --- | --- |
| High-frequency deterrent | Steady 18 kHz tone |
| Unpredictable beeps | Harder for birds to predict |
| Variable pitch sweep | Continuously shifts frequency |
| Gull deterrent | Steady tone for roofs and docks |
| Randomized beeps | Random timing for long sessions |
| Pigeon distress call | Real pigeon distress recording |
| Red-tailed hawk scream | Real red-tailed hawk recording |
| Peregrine alarm call | Real peregrine falcon recording |
| Maximum frequency | 22 kHz. Needs a PigeonX speaker |

All four bird calls are real recordings. Nothing in the app is a stand-in any
more, and no screen says one is. Where each recording came from lives in
`assets/audio/SOURCES.md`, and Settings shows those credits under About.

## Numbers

Pitch is the number, everywhere a person reads it: `18 kHz`, `16 kHz`,
`15 to 19 kHz`, `22 kHz`. LOW, HIGH and VERY HIGH are gone. They told nobody
anything they could check, and they flattened 15 kHz and 22 kHz into one word.

A recording is the exception, because a bird call is a spread of pitches and
not one number. Those read `Low frequency`.

A number on a card is never a promise that this phone reproduces it. What a
speaker can really play is answered by the reach meter in the pitch and
loudness sheet, and by the audible tag on the card.

Labels live in `pitchLabel()` in `src/core/profiles.ts`.

## Speaker reach

The app never pretends a phone can play a 25 kHz sound. The pitch and loudness
sheet asks "Will this speaker play it?" and answers with one word plus one
sentence:

- Yes. This speaker plays the whole sound.
- Partly. Phone speakers play the low part. The top is lost.
- No. Phone speakers can't play sounds this high. Use a PigeonX speaker.

## The audible tag

Every sound carries one small chip saying who will hear it. Four states, and
no others:

- `AUDIBLE`. Every recording, and any generated sound under 15 kHz.
- `MAY BE AUDIBLE`. Generated, 15 to 20 kHz. Phone speakers roll off near the
  top of that band and hearing up there falls away with age.
- `TYPICALLY INAUDIBLE`. 22 kHz, and only out of a PigeonX speaker.
- `NEEDS A PIGEONX SPEAKER`. 22 kHz on a phone. Nothing comes out, so the
  question of hearing it never arises. The card never says audible or
  inaudible here.

The dot is yellow for the first two and muted for the last two: a sound
nothing can play is a fact, not a warning. Tapping the chip opens the one
panel that explains the state it is in.

Yellow appears nowhere else on a row. Locks are muted ink, because a locked
row is not a warning.

## Where a recording came from

Every card says `Natural recording` or `Generated tone`. The four recordings
are credited by recordist and licence in Settings under About, and from the
Credits row at the bottom of Sounds. The full detail lives in
`assets/audio/SOURCES.md`.

## Business words

A business owns places. A place is a building, an area is one part of it, a
speaker sits in an area. Everyone else on the business is a teammate, and you
add one by sending an invite.

Three things a teammate can be:

- Owner. Can do everything, including billing.
- Manager. Can add places, areas, speakers and times.
- Teammate. Can play a sound and see what played.

## When something goes wrong

Every line says what happened and what to do next. No codes, no names of
things inside the app.

| What happened | What a person reads |
| --- | --- |
| the phone is not online | Your phone is not online. Try again in a minute. |
| the server has not shipped this yet | This part is not ready yet. Try again later. |
| the account is not allowed | You do not have permission to do that. |
| the name is taken | That name is already taken. Pick another one. |
| too many tries | Too many tries. Wait a minute and try again. |
| the email link ran out | That link ran out. Ask for a new one. |
| the email link was used | That link was already used. Ask for a new one. |
| a wrong email address | Check the email address and try again. |
| the store is not up | The store is not ready. Try again. |
| anything else | That didn't work. Try again. |

A person backing out on purpose is never an error. Nothing is said at all.

## The three honest facts

They used to sit on Settings as a list nobody had asked for. They live inside
the Help answers now, where a person meets them while they are looking, and on
the third welcome screen.

1. Phones cannot reach the highest sounds. A PigeonX speaker can.
   Lives in Help, "Which speaker should I use?".
2. Sounds inside human hearing carry an Audible tag.
   Lives on the third welcome screen and one tap behind every audible chip.
3. Distress calls are well studied. They are audible, so people nearby hear
   them too. Lives in Help, "Getting the best results".

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
