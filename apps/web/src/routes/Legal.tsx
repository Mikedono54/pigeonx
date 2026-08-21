import type { ReactNode } from 'react';
import { Container } from '../components/ui/Container';

function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <section className="relative pt-32 pb-24 sm:pt-40">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(45,212,191,0.10),transparent_70%)]"
      />
      <Container size="narrow">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-teal uppercase">Legal</p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold text-fg">{title}</h1>
        <p className="mt-3 font-mono text-[13px] text-fg-muted">Last updated {updated}</p>
        <div className="mt-10 flex flex-col gap-7">{children}</div>
      </Container>
    </section>
  );
}

function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[18px] font-semibold text-fg">{heading}</h2>
      <div className="mt-2.5 flex flex-col gap-3 text-[15px] leading-relaxed text-fg-muted">
        {children}
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="21 August 2026">
      <p className="text-[15px] leading-relaxed text-fg-muted">
        PigeonX is built by a small team and this policy is written to be read, not to be survived.
        It covers pigeonx.org and the PigeonX mobile app.
      </p>
      <Block heading="What we collect">
        <p>
          If you contact us through this site we collect the name, business, email, city, property
          type and message you type into the form. If you join the launch list we collect your email
          address. That is the whole of it for the website — we do not run advertising trackers or
          third-party analytics profiles on pigeonx.org.
        </p>
        <p>
          In the app, an account stores your email address, your saved audio profiles, and a record
          of the deterrent sessions you run — when a session started and ended, which profile and
          output it used, and which zone it belonged to. Business accounts additionally store the
          locations, zones, devices and team members you create.
        </p>
      </Block>
      <Block heading="Why we collect it">
        <p>
          To reply to you, to run the product you asked for, and to produce the before-and-after
          measurements a pilot depends on. We do not sell personal data, and we do not share it with
          advertisers.
        </p>
      </Block>
      <Block heading="Who processes it">
        <p>
          Netlify hosts this site and receives form submissions. Supabase hosts the application
          database and authentication. App store and payment providers handle their own transactions
          under their own terms. Each of these processes data on our instruction.
        </p>
      </Block>
      <Block heading="How long we keep it">
        <p>
          Contact submissions are kept while a conversation is live and for up to two years after.
          Account and session data lives as long as your account does; delete your account and we
          remove it, with backups aging out within 30 days.
        </p>
      </Block>
      <Block heading="Your choices">
        <p>
          Ask us for a copy of your data, a correction, or deletion at any time by emailing{' '}
          <a className="text-teal underline-offset-4 hover:underline" href="mailto:privacy@pigeonx.org">
            privacy@pigeonx.org
          </a>
          . We will action it within 30 days.
        </p>
      </Block>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="21 August 2026">
      <p className="text-[15px] leading-relaxed text-fg-muted">
        These terms cover your use of the PigeonX website, mobile app and hardware. Using any of them
        means you accept them.
      </p>
      <Block heading="What PigeonX is">
        <p>
          PigeonX is a sound-based bird deterrence platform. It plays audio profiles through a phone,
          a Bluetooth speaker or PigeonX hardware, and it records what ran. It is a deterrent — a set
          of conditions birds tend to avoid — not an exterminator and not a guarantee.
        </p>
      </Block>
      <Block heading="No guarantee of results">
        <p>
          Bird behaviour varies by species, site, season and food source. We publish measured pilot
          results rather than efficacy claims, and nothing on this site should be read as a promise
          of a particular outcome on your property.
        </p>
      </Block>
      <Block heading="Your responsibilities">
        <p>
          You are responsible for using PigeonX lawfully: observing local noise ordinances and
          quiet hours, respecting wildlife protection laws that apply to the species on your site,
          and considering neighbours, staff, guests and animals. Do not use PigeonX to harass people
          or to target protected species where local law forbids it.
        </p>
      </Block>
      <Block heading="Accounts, plans and billing">
        <p>
          Paid plans renew automatically until cancelled. App subscriptions are billed by the
          relevant app store under its refund rules; Business and Enterprise plans are billed per
          location and cancellable at the end of the current term. Prices shown on this site are in
          USD and may change with notice.
        </p>
      </Block>
      <Block heading="Hardware">
        <p>
          PigeonX emitters sold or leased with the platform carry a 12-month limited warranty against
          manufacturing defects. Pilot units are provided as-is for evaluation and remain our
          property unless a purchase is agreed in writing.
        </p>
      </Block>
      <Block heading="Liability">
        <p>
          To the fullest extent the law allows, our total liability arising from the service is
          limited to the amount you paid us in the twelve months before the claim. We are not liable
          for indirect or consequential loss.
        </p>
      </Block>
      <Block heading="Contact">
        <p>
          Questions about these terms go to{' '}
          <a className="text-teal underline-offset-4 hover:underline" href="mailto:hello@pigeonx.org">
            hello@pigeonx.org
          </a>
          .
        </p>
      </Block>
    </LegalPage>
  );
}
