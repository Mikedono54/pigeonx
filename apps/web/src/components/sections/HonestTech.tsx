import { Ear, Gauge, Volume2 } from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const MAX_KHZ = 28;
const AUDIBLE_KHZ = 17;

const OUTPUTS = [
  {
    label: 'Phone speaker',
    ceiling: 18,
    note: 'Small drivers roll off fast',
    color: 'linear-gradient(90deg,#2DD4BF 0%,#22D3EE 100%)',
  },
  {
    label: 'Bluetooth speaker',
    ceiling: 19,
    note: 'SBC / AAC codec limited',
    color: 'linear-gradient(90deg,#22D3EE 0%,#3B82F6 100%)',
  },
  {
    label: 'PigeonX emitter',
    ceiling: 25,
    note: 'Purpose-built tweeter',
    color: 'linear-gradient(90deg,#3B82F6 0%,#2DD4BF 100%)',
  },
];

const POINTS = [
  {
    icon: Gauge,
    title: 'We show the real ceiling of every output',
    body: 'A phone speaker cannot produce 25 kHz, and no app can change that. PigeonX labels the effective range of whatever you are playing through, so you always know what is actually leaving the speaker.',
  },
  {
    icon: Volume2,
    title: 'Audible profiles are included on purpose',
    body: 'Distress and predator calls have better field evidence than ultrasonic tones alone. They are in the library, clearly marked, and you decide when they are appropriate for your property.',
  },
  {
    icon: Ear,
    title: 'We flag anything your guests may hear',
    body: 'Energy below about 17 kHz is audible to plenty of people, especially younger guests. Those profiles carry a "guests may hear this" badge before you start a run — not after.',
  },
];

function CeilingChart() {
  const audiblePct = (AUDIBLE_KHZ / MAX_KHZ) * 100;
  const ticks = [0, 7, 14, 21, 28];

  return (
    <Card glow className="bg-[#101830] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[15px] font-semibold text-fg">Effective output ceiling</h3>
        <span className="font-mono text-[11px] text-fg-muted">0 – {MAX_KHZ} kHz</span>
      </div>

      <ul className="mt-5 flex flex-col gap-5">
        {OUTPUTS.map((o) => (
          <li key={o.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-fg">{o.label}</span>
              <span className="font-mono text-[13px] font-medium text-teal tabular-nums">
                ≤ {o.ceiling} kHz
              </span>
            </div>

            <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${(o.ceiling / MAX_KHZ) * 100}%`, background: o.color }}
              />
              {/* audible band, drawn over the bar and confined to the track */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,rgba(11,18,32,0.55)_0_4px,transparent_4px_8px)]"
                style={{ width: `${audiblePct}%` }}
              />
              <span
                aria-hidden
                className="absolute inset-y-0 w-px bg-warning"
                style={{ left: `${audiblePct}%` }}
              />
            </div>

            <p className="mt-2 text-[11.5px] text-fg-muted">{o.note}</p>
          </li>
        ))}
      </ul>

      {/* axis */}
      <div aria-hidden className="relative mt-4 h-4 border-t border-border-line">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-1 font-mono text-[10px] text-fg-muted"
            style={{
              left: `${(t / MAX_KHZ) * 100}%`,
              transform:
                t === 0 ? 'none' : t === MAX_KHZ ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-2.5 border-t border-border-line pt-4">
        <span
          aria-hidden
          className="mt-0.5 h-3 w-3 shrink-0 rounded-[3px] bg-teal bg-[repeating-linear-gradient(135deg,rgba(11,18,32,0.65)_0_3px,transparent_3px_6px)] ring-1 ring-warning/50"
        />
        <p className="text-[11.5px] leading-snug text-fg-muted">
          Hatched section: below ~{AUDIBLE_KHZ} kHz many people can still hear the output. Any
          profile with energy in that band is badged in the app.
        </p>
      </div>
    </Card>
  );
}

export function HonestTech() {
  return (
    <section
      id="honest"
      className="relative overflow-hidden border-y border-border-line bg-surface/40 py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="absolute top-1/2 -left-40 h-[420px] w-[520px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.12),transparent_70%)] blur-[60px]"
      />
      <Container className="relative">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Built on what actually works"
              title="The honest version of the physics — because it is the reason this works."
              description="Most bird gadgets sell a number they cannot produce. We show you the ceiling, include the profiles with the better evidence, and measure the result on your property."
            />

            <ul className="mt-10 flex flex-col gap-6">
              {POINTS.map(({ icon: Icon, title, body }, i) => (
                <Reveal as="li" key={title} delay={i * 0.06} className="flex gap-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border-line bg-card text-teal">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-fg">{title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={0.1} className="lg:sticky lg:top-28">
            <CeilingChart />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
