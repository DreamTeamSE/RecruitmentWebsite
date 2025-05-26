"use client";

import React from 'react';
import Image from 'next/image'; // Import Next.js Image component
import { Button } from "@/components/ui/button"; // Assuming this uses your best practice buttonVariants
import { ArrowRight } from 'lucide-react';

// Placeholder image for the right column - replace with your actual image path
const sectionImageSrc = "https://placehold.co/800x600/A5B4FC/FFFFFF?text=Sponsorship+Visual&font=outfit";
const sectionImageAlt = "Visual representation for sponsorship";

export default function SponsorUsSection() {
  return (
    // Section uses 'bg-muted/30' for a very light background, similar to the image
    <section className="py-16 sm:py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content & Buttons */}
          <div className="md:col-span-7 lg:col-span-7">
            {/* Main heading uses 'text-foreground' and should pick up h2 styles from global.css */}
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Sponsor Us!
            </h2>
            {/* Paragraphs use 'text-muted-foreground' */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
              Dream Team Engineering is a 501(c)(3) non-profit organization at the University of Florida.
              Any money donated to Dream Team Engineering will directly fund our ongoing projects.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
              Without the support of our sponsors we would not be able to fund our incredible projects of
              create connections for our members with highly-respected companies. Below are the
              sponsorship tiers to show our thanks for your sponsorship in a number of ways.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button
                variant="default" // Uses bg-primary, text-primary-foreground. Ensure --primary is the purple-blue.
                size="lg"
                className="rounded-full group px-6"
                onClick={() => console.log("Donate clicked")}
              >
                Donate
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline" // This will use border-input. If you want primary color border, style explicitly.
                                  // For image match (primary color border):
                                  // className="rounded-full border-2 border-primary text-primary hover:bg-primary/10 group px-6"
                size="lg"
                className="rounded-full border-2 border-primary text-primary hover:bg-primary/10 group px-6"
                onClick={() => console.log("Learn More clicked")}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="hidden md:block md:col-span-5 lg:col-span-5">
            <div className="relative w-full aspect-[4/3] rounded-[var(--radius)] overflow-hidden shadow-lg">
              <Image
                src={sectionImageSrc}
                alt={sectionImageAlt}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 hover:scale-105"
                unoptimized={sectionImageSrc.startsWith('https://placehold.co')}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Removed style jsx global block as DecorativeLine component and its animations are removed */}
    </section>
  );
}
