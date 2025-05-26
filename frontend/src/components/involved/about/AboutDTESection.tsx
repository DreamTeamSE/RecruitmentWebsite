"use client";

import React from 'react';
import Image from 'next/image';

// Placeholder image - replace with your actual image path
const sectionImageSrc = "https://placehold.co/800x600/A5B4FC/FFFFFF?text=College+of+Medicine&font=outfit";
const sectionImageAlt = "Students at the College of Medicine";

export default function AboutDTESection() {
  return (
    // Section uses 'bg-background' for a white background as per the image
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="md:pr-8">
            {/* Main heading uses 'text-foreground' and should pick up h1/h2 styles from global.css (font-serif) */}
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Dream a better today, design a better tomorrow
            </h2>
            {/* Paragraphs use 'text-muted-foreground' for a slightly lighter text color */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
              Dream Team Engineering is a student-led organization that partners with medical
              professionals to develop innovative technologies that enhance patient care at UF
              Health Shands and beyond.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              With branches in design, software, and research, the team creates educational tools,
              user-friendly medical apps, and tests their real-world impact. They also offer a
              shadowing program to support underclassmen interested in healthcare
              innovation.
            </p>
          </div>

          {/* Right Column: Image */}
          <div className="relative w-full aspect-[4/3] rounded-[var(--radius)] overflow-hidden shadow-lg">
            {/* Using Next.js Image component */}
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
    </section>
  );
}
