import { Apple, ArrowRight, Play, ShieldCheck } from 'lucide-react';
import { Container } from '../ui/Container';
import { ButtonLink } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { PhoneMock } from '../PhoneMock';
import { WaveBackdrop } from '../WaveBackdrop';

export function StoreButtons({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ButtonLink href="#download" size={size} variant="secondary" className="pr-4 pl-3.5">
        <Apple size={20} aria-hidden className="shrink-0" />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-medium text-fg-muted">Download on the</span>
          <span className="mt-1 text-[14px] font-semibold">App Store</span>
        </span>
      </ButtonLink>
      <ButtonLink href="#download" size={size} variant="secondary" className="pr-4 pl-3.5">
        <Play size={18} aria-hidden className="shrink-0" />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-medium text-fg-muted">Get it on</span>
          <span className="mt-1 text-[14px] font-semibold">Google Play</span>
        </span>
      </ButtonLink>
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-warning uppercase">
        Coming soon
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-28">
      {/* layered background */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#16233D_0%,#0B1220_58%)]" />
        <div className="absolute inset-0 px-noise opacity-60" />
        <div className="absolute -top-40 left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.16),transparent_72%)] blur-[60px]" />
        <div className="absolute top-24 -right-32 h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.16),transparent_70%)] blur-[70px]" />
      </div>
      <WaveBackdrop className="-z-10 opacity-70 [mask-image:linear-gradient(to_bottom,transparent,#000_28%,#000_72%,transparent)]" />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
          <div className="flex flex-col items-start">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[12px] font-medium text-fg-muted backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
                Humane bird deterrence, from your phone
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-6 max-w-[17ch] text-[clamp(2.25rem,6.2vw,3.85rem)] leading-[1.04] font-bold tracking-[-0.03em] text-fg">
                Smarter, humane bird deterrence for the{' '}
                <span className="px-gradient-text">places people gather.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
                PigeonX turns a smartphone into the control center for a smarter bird-deterrence
                system — pick a profile, route it to your speakers or PigeonX emitters, schedule it
                around service, and watch what changes on your patio.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-8 w-full">
              <StoreButtons />
            </Reveal>

            <Reveal delay={0.2} className="mt-5 w-full">
              <ButtonLink href="#contact" variant="ghost" size="md" className="-ml-2 px-2">
                Talk to us about a pilot
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </ButtonLink>
            </Reveal>

            <Reveal delay={0.25} className="mt-8 w-full">
              <p className="flex items-center gap-2 text-[13px] text-fg-muted">
                <ShieldCheck size={15} className="shrink-0 text-teal" aria-hidden />
                No traps, no spikes, no chemicals. Sound-based and reversible.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="relative">
            <PhoneMock />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
