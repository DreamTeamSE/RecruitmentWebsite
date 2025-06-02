"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link'; // For making logos clickable
import { affiliationsData } from '@/lib/data/sponsor/affiliationsData';

export default function AffiliationsSection() {
  return (
    // Section background matches the image (very light lavender/gray)
    <section className="py-16 sm:py-24 bg-[#F3F4F9]"> {/* Explicit light purple background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          {/* Title uses 'text-foreground' and should pick up h2/h3 styles from global.css */}
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Affiliations
          </h2>
        </div>

        {/* Affiliation Logos Container - White box */}
        {/* Using bg-background which should be white from your theme */}
        <div className="bg-background p-6 sm:p-8 md:p-10 rounded-[var(--radius)] shadow-md">
          {/* Using flex-wrap for logo layout, similar to sponsors section */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-8 sm:gap-x-10 md:gap-x-12 lg:gap-x-16">
            {affiliationsData.map((affiliation) => (
              <Link href={affiliation.websiteUrl} key={affiliation.id} target="_blank" rel="noopener noreferrer" className="group">
                {/* Container for each logo to control its size and hover effect */}
                <div className="relative h-16 sm:h-20 md:h-24 transition-opacity duration-300 group-hover:opacity-75 flex items-center justify-center px-2"> {/* Added padding to individual logo container */}
                  <Image
                    src={affiliation.logoSrc}
                    alt={`${affiliation.name} logo`}
                    width={180} // Base width, adjust as needed for your logos
                    height={70}  // Base height, adjust as needed
                    objectFit="contain" // Ensures entire logo is visible and scaled correctly
                    className="max-h-full max-w-full" // Ensure image doesn't overflow its container
                    unoptimized={affiliation.logoSrc.startsWith('https://placehold.co')}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
