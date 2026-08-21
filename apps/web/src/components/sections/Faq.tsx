import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { cn } from '../../lib/cn';

const FAQS = [
  {
    q: 'Is it safe for people and pets?',
    a: 'Yes. PigeonX makes sound — no traps, spikes, chemicals, nets or lasers, and nothing that touches a bird. Output runs at conversational volume levels, and the effect is a place birds choose to avoid rather than anything that harms them. Dogs and cats hear higher than we do, so if a pet lives on the property we recommend the audible call profiles and a schedule that runs when the animal is inside.',
  },
  {
    q: 'Will guests hear it?',
    a: 'Sometimes, and the app tells you before you press start. Energy below roughly 17 kHz is audible to plenty of people, especially under 30, and every profile with content in that band carries a "guests may hear this" badge. Audible distress and predator-call profiles are obviously audible by design — those are for closed hours, back-of-house and rooftops rather than a full dining room.',
  },
  {
    q: 'Does ultrasonic really work on pigeons?',
    a: 'Honestly: the evidence for ultrasonic alone is weak, and pigeons hear roughly the same range people do. That is precisely why PigeonX is not an ultrasonic box. The profile library leads with the better-evidenced approaches — distress and predator calls, randomised and irregular playback that resists habituation — and every pilot measures bird activity before and after so you are looking at your own numbers, not a manufacturer claim.',
  },
  {
    q: 'Do I need special hardware?',
    a: 'No. PigeonX works on the phone in your pocket and on Bluetooth speakers you already own. PigeonX emitters add two things you cannot get any other way: genuine output above 19 kHz, and schedules that run when nobody is holding a phone.',
  },
  {
    q: 'Can it run on a schedule when my phone is locked?',
    a: 'A phone will not run arbitrary background timers — iOS in particular will not allow it — so we do not pretend otherwise. On a phone, a schedule is a notification at the right moment with a one-tap start, and a running session keeps playing with the screen locked. For genuinely unattended windows, the schedule lives on a PigeonX emitter and executes on the device.',
  },
  {
    q: 'Which speakers work?',
    a: 'Any Bluetooth speaker your phone can pair with, plus wired outputs and most existing patio PA systems. Bear in mind that Bluetooth codecs such as SBC and AAC cut off around 19 kHz, so the app shows the effective ceiling for whatever you have selected and will not let you believe you are emitting 25 kHz through a portable speaker.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-y border-border-line bg-surface/40 py-20 sm:py-28">
      <Container size="narrow">
        <SectionHeading
          eyebrow="FAQ"
          title="The questions operators actually ask."
          description="Including the ones with awkward answers."
        />

        <div className="mt-12 flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <div
                  className={cn(
                    'overflow-hidden rounded-[var(--radius-md)] border transition-colors duration-200',
                    isOpen ? 'border-teal/30 bg-elevated' : 'border-border-line bg-card',
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-trigger-${i}`}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4.5 text-left transition-colors duration-200 hover:bg-white/[0.03]"
                    >
                      <span className="font-display text-[15.5px] font-semibold text-fg sm:text-[16px]">
                        {item.q}
                      </span>
                      <Plus
                        size={18}
                        aria-hidden
                        className={cn(
                          'shrink-0 text-teal transition-transform duration-200 ease-[var(--ease-out-expo)]',
                          isOpen && 'rotate-45',
                        )}
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                    hidden={!isOpen}
                  >
                    <p className="border-t border-border-line px-5 py-4 text-[14.5px] leading-relaxed text-fg-muted">
                      {item.a}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
