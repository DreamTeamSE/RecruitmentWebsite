import AffiliationsSection from "@/components/involved/sponsor/Affiliate";
import CurrentSponsorsSection from "@/components/involved/sponsor/CurrentSponsorsSection";
import SponsorshipTiersSection from "@/components/involved/sponsor/SponsorshipTiersSection";
import SponsorUsSection from "@/components/involved/sponsor/SponsorUs";

export default function Page() {
  return (
    <>
      <SponsorUsSection />
      <CurrentSponsorsSection/>
      <SponsorshipTiersSection />
      <AffiliationsSection />
    </>
  );
}
