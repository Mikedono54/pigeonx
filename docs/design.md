# PigeonX design guide

Tokens live in code: `packages/core/src/tokens.ts`, exported to Tailwind (web)
and NativeWind (mobile) through `tailwindPreset`. Nothing hard-codes a hex.
`design-system/pigeonx/MASTER.md` carries the long form — component CSS, motion,
anti-patterns, the pre-delivery checklist. This page is the summary a developer
reads before opening a component file.

## Tokens

```ts
import { tokens, tailwindPreset } from '@pigeonx/core';
```

```js
// tailwind.config.js (web and mobile)
import { tailwindPreset } from '@pigeonx/core';
export default { presets: [tailwindPreset], content: [...] };
```

### Color

| Purpose             | Token        | Hex       | Tailwind         |
| ------------------- | ------------ | --------- | ---------------- |
| App background      | `background` | `#0B1220` | `bg-bg`          |
| Panel               | `surface`    | `#111A2E` | `bg-surface`     |
| Card                | `card`       | `#151F36` | `bg-card`        |
| Elevated            | `elevated`   | `#1B2742` | `bg-elevated`    |
| Border              | `border`     | `#243049` | `border-border`  |
| Text                | `fg`         | `#F1F5F9` | `text-fg`        |
| Secondary text      | `fgMuted`    | `#8B97AD` | `text-fg-muted`  |
| Tertiary / disabled | `fgSubtle`   | `#5B6881` | `text-fg-subtle` |
| Brand teal          | `accentTeal` | `#2DD4BF` | `text-teal`      |
| Brand blue          | `accentBlue` | `#3B82F6` | `text-blue`      |
| CTA fill            | `accent`     | `#22D3EE` | `bg-accent`      |
| On CTA              | `onAccent`   | `#06121F` | `text-on-accent` |
| Success             | `success`    | `#34D399` | `text-success`   |
| Warning             | `warning`    | `#FBBF24` | `text-warning`   |
| Danger              | `danger`     | `#F87171` | `text-danger`    |

Gradient `linear-gradient(135deg,#2DD4BF 0%,#3B82F6 100%)` (`bg-gradient-brand`)
is for the mark, hero washes and one primary CTA per screen. Never behind text.
Never pure black — `#0B1220` is the floor.

### Type

- Display / headings — **Outfit** 600/700 (`font-display`)
- Body / UI — **Inter** 400/500/600 (`font-body`)
- Numeric readouts — **JetBrains Mono** 500 (`font-mono`)

Sizes: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48. Mobile inputs never below 16px.

### Radius and space

Radii 8 / 12 / 16 / 24 / 999 (`sm md lg xl pill`). Spacing is 4-based:
`space[n] = n * 4px`; cards use 24, screen gutters 16 on mobile and 24+ on web.

## Component rules

**Buttons.** Minimum 44x44px touch target everywhere, web included. Primary is
`accent` fill with `on-accent` text at radius-md; secondary is transparent with a
`border` outline; the gradient button is reserved for the single most important
action on a screen (Start, Upgrade, Join the pilot). Press feedback is
`scale(0.98)`, never a layout shift. Focus is a visible 2px `accent` ring.

**Gated actions never render dead.** A Free user tapping a Pro profile sees a
lock and gets the paywall sheet — not a disabled control with no explanation.

**Cards.** `card` background, 1px `border`, radius-lg, 24px padding. Hover
changes background and border color only; zone cards carry live status and must
not move under the cursor.

**Status pills.** Radius-pill, 28px tall, 12px semibold, tinted background at
~15% of the status color with the status color as text: idle (muted), running
(success), scheduled (blue), offline (danger), "guests may hear this" (warning).
Color never carries the meaning alone — the label always spells it out, and a
running pill shows elapsed time: `Running 12:40`.

**Number readouts.** Frequencies, timers, session counts and percentages use
`font-mono` with `tabular-nums` so live digits do not jitter. Format frequencies
as `18.0 kHz`, durations as `12:40`, never raw integers.

**Inputs.** 44px min height, `surface` fill, `border` outline at radius-sm, 16px
text, `fg-subtle` placeholder, `accent` border plus a 3px translucent ring on
focus, `danger` border when invalid with the message below the field.

**Sheets and modals.** Radius-xl, `elevated` background, 1px `border`, overlay
`rgba(2,8,20,0.66)` with an 8px blur. Mobile pickers and paywalls are bottom
sheets with a grab handle.

**Effective-range indicator.** Driven by `effectiveForOutput(profile, output)`:
teal for `full`, amber up to the ceiling for `partial`, grey with a danger label
for `none`. The app states what the chosen output can actually reproduce — a
22 kHz profile on a phone speaker says so instead of pretending.

**Motion.** 150–300ms, ease-out; respect `prefers-reduced-motion`. Spectrum
visualiser and live status animate continuously; everything else transitions
once and settles.

**Accessibility.** 4.5:1 minimum text contrast, visible keyboard focus, SVG
icons (Lucide) rather than emoji, no horizontal scroll at 375px.
