import { Hero } from '../components/sections/Hero';
import { TrustStrip } from '../components/sections/TrustStrip';
import { Problem } from '../components/sections/Problem';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Platform } from '../components/sections/Platform';
import { HonestTech } from '../components/sections/HonestTech';
import { Pricing } from '../components/sections/Pricing';
import { Hardware } from '../components/sections/Hardware';
import { Pilots } from '../components/sections/Pilots';
import { Faq } from '../components/sections/Faq';
import { Download } from '../components/sections/Download';
import { Contact } from '../components/sections/Contact';

export default function Marketing() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Problem />
      <HowItWorks />
      <Platform />
      <HonestTech />
      <Pricing />
      <Hardware />
      <Pilots />
      <Faq />
      <Download />
      <Contact />
    </>
  );
}
