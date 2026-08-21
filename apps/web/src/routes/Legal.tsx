import type { ReactNode } from 'react';
import { Container } from '../components/ui/Container';

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="border-b border-line">
        <Container className="py-12 lg:py-16">
          <p className="px-label text-muted">Legal</p>
          <h1 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em]">
            {title}
          </h1>
          <p className="px-label mt-5 text-muted">Last updated {updated}</p>
        </Container>
      </section>
      <section className="border-b border-line">
        <Container className="py-12 lg:py-16">
          <div className="flex max-w-[54rem] flex-col">{children}</div>
        </Container>
      </section>
    </>
  );
}

function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-7 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="font-display text-[19px] font-semibold">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[16px] text-muted">{children}</div>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="21 August 2026">
      <Block heading="Scope">
        <p>
          This policy covers pigeonx.org and the PigeonX mobile app. It is written to be read, not
          to be survived.
        </p>
      </Block>
      <Block heading="What we collect">
        <p>
          If you contact us through this site we collect the name, business, email, city, property
          type and message you type into the form. If you join the launch list we collect your email
          address. That is all of it for the website. We run no advertising trackers and no third
          party analytics profiles on pigeonx.org.
        </p>
        <p>
          In the app, an account stores your email address, your saved audio profiles, and a record
          of the deterrent sessions you run: when a session started and ended, which profile and
          output it used, and which zone it belonged to. Business accounts also store the locations,
          zones, devices and team members you create.
        </p>
      </Block>
      <Block heading="Why we collect it">
        <p>
          To reply to you, to run the product you asked for, and to produce the before and after
          measurements a pilot depends on. We do not sell personal data and we do not share it with
          advertisers.
        </p>
      </Block>
      <Block heading="Who processes it">
        <p>
          Netlify hosts this site and receives form submissions. Supabase hosts the application
          database and authentication. App store and payment providers handle their own transactions
          under their own terms. Each of them processes data on our instruction.
        </p>
      </Block>
      <Block heading="How long we keep it">
        <p>
          Contact submissions stay on file while a conversation is live and for up to two years
          after. Account and session data lives as long as your account does. Delete the account and
          we remove it, with backups aging out within 30 days.
        </p>
      </Block>
      <Block heading="Your choices">
        <p>
          Ask us for a copy of your data, a correction, or deletion at any time by emailing{' '}
          <a
            className="border-b border-accent pb-0.5 text-accent hover:border-ink hover:text-ink"
            href="mailto:privacy@pigeonx.org"
          >
            privacy@pigeonx.org
          </a>
          . We action it within 30 days.
        </p>
      </Block>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="21 August 2026">
      <Block heading="What PigeonX is">
        <p>
          PigeonX is a sound based bird deterrence platform. It plays audio profiles through a
          phone, a Bluetooth speaker or PigeonX hardware, and it records what ran. It is a
          deterrent, a set of conditions birds tend to avoid. It is not an exterminator and it is
          not a guarantee.
        </p>
      </Block>
      <Block heading="No guarantee of results">
        <p>
          Bird behaviour varies by species, site, season and food source. We publish measured pilot
          results in place of efficacy claims. Nothing on this site should be read as a promise of a
          particular outcome on your property.
        </p>
      </Block>
      <Block heading="Your responsibilities">
        <p>
          You are responsible for using PigeonX within the law: local noise ordinances and quiet
          hours, wildlife protection rules that cover the species on your site, and the people and
          animals around you. Do not use PigeonX to harass people or to target protected species
          where local law forbids it.
        </p>
      </Block>
      <Block heading="Accounts, plans and billing">
        <p>
          Paid plans renew until you cancel. App subscriptions are billed by the relevant app store
          under its refund rules. Business and Enterprise plans are billed per location and can be
          cancelled at the end of the current term. Prices shown on this site are in USD and may
          change with notice.
        </p>
      </Block>
      <Block heading="Hardware">
        <p>
          PigeonX emitters sold or leased with the platform carry a 12 month limited warranty
          against manufacturing defects. Pilot units are provided as they are, for evaluation, and
          remain our property unless a purchase is agreed in writing.
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
          <a
            className="border-b border-accent pb-0.5 text-accent hover:border-ink hover:text-ink"
            href="mailto:hello@pigeonx.org"
          >
            hello@pigeonx.org
          </a>
          .
        </p>
      </Block>
    </LegalPage>
  );
}
