"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link'; // For making logos clickable

interface Sponsor {
  id: number;
  name: string;
  logoSrc: string;
  websiteUrl: string; // Link to sponsor's website
}

// Placeholder sponsor data - replace with your actual sponsor logos and links
// Ensure logoSrc paths are correct (e.g., in /public/images/sponsors/)
const sponsorsData: Sponsor[] = [
  {
    id: 1,
    name: "Study Edge",
    logoSrc: "https://placehold.co/200x80/FFFFFF/000000?text=Study+Edge&font=outfit", // Adjusted placeholder size
    websiteUrl: "#", // Replace with actual URL
  },
  {
    id: 2,
    name: "NVIDIA",
    logoSrc: "https://placehold.co/150x60/FFFFFF/76B900?text=NVIDIA&font=outfit", // Adjusted placeholder size
    websiteUrl: "#",
  },
  {
    id: 3,
    name: "Mark III Systems",
    logoSrc: "https://placehold.co/200x80/FFFFFF/003A70?text=Mark+III+Systems&font=outfit", // Adjusted placeholder size
    websiteUrl: "#",
  },
  {
    id: 4,
    name: "Edwards Lifesciences",
    logoSrc: "https://placehold.co/150x100/E1E1E1/58595B?text=Edwards&font=outfit", // Adjusted placeholder size
    websiteUrl: "#",
  },
  // Add more sponsors if needed
];

export default function CurrentSponsorsSection() {
  return (
    // Section background matches the image (very light lavender/gray)
    <section className="py-16 sm:py-24 bg-[#F3F4F9]"> {/* Explicit light purple background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          {/* Title uses 'text-foreground' and should pick up h2/h3 styles from global.css */}
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Thank you to our current sponsors!
          </h2>
        </div>

        {/* Sponsor Logos Container - White box */}
        {/* Using bg-background which should be white from your theme */}
        <div className="bg-white p-8 sm:p-10 md:p-12 rounded-[var(--radius)] shadow-md">
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-8 sm:gap-x-10 md:gap-x-12 lg:gap-x-16">
            {sponsorsData.map((sponsor) => (
              <Link href={sponsor.websiteUrl} key={sponsor.id} target="_blank" rel="noopener noreferrer" className="group">
                {/* Increased height for logos to better match the image proportions */}
                <div className="relative h-14 sm:h-16 md:h-20 lg:h-24 transition-opacity duration-300 group-hover:opacity-75 flex items-center justify-center">
                  <Image
                    src={sponsor.logoSrc}
                    alt={`${sponsor.name} logo`}
                    width={180} // Base width, height will be constrained by parent
                    height={80} // Base height, objectFit="contain" will scale it down
                    objectFit="contain" // Ensures entire logo is visible and scaled correctly
                    className="max-h-full max-w-full" // Ensure image doesn't overflow its container
                    unoptimized={sponsor.logoSrc.startsWith('https://placehold.co')}
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
