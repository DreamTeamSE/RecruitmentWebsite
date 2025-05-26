import Vision from "@/components/home/Vison";
import Carousel from "@/components/home/Carousel";
import ExploreMoreSection from "@/components/home/ExploreMoreSection";
import WhyDTESection from "@/components/home/WhyDTE";
import Testimonial from "@/components/home/Testimonial";

export default function Page() {
  return (
    <>
      <Vision />
      <Carousel />
      <WhyDTESection />
      <ExploreMoreSection />
      <Testimonial />
    </>
  );
}
