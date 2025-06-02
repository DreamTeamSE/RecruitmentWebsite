"use client";

import React from 'react';
import Image from 'next/image';

import { FeatureCardProps } from '@/models/types/home';
import { featureCardsData } from '../../lib/data/home/featureCardsData';

// Reusable Feature Card Component
const FeatureCard: React.FC<FeatureCardProps> = ({ imageSrc, imageAlt, title, description }) => {
  return (
    <div className="flex flex-col bg-card rounded-[var(--radius)] shadow-lg overflow-hidden border border-border transition-shadow hover:shadow-xl">
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-semibold text-foreground mb-2 font-serif"> {/* Uses theme font-serif */}
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed"> {/* Uses theme text-muted-foreground */}
          {description}
        </p>
      </div>
      <div className="relative w-full h-48"> {/* Fixed height for the image container */}
        <Image
          src={imageSrc}
          alt={imageAlt}
          layout="fill"
          objectFit="cover"
          unoptimized={imageSrc.startsWith('https://placehold.co')}
        />
      </div>
    </div>
  );
};

export default function WhyDTESection() {
  return (
    // Section uses 'bg-background' from your theme (likely white from image)
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          {/* Main title uses 'text-foreground' and should pick up h2 styles from global.css */}
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Why DTE?
          </h2>
          {/* Subtitle uses 'text-muted-foreground' */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Dream a better today, design a better tomorrow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featureCardsData.map((card) => (
            <FeatureCard
              key={card.title}
              imageSrc={card.imageSrc}
              imageAlt={card.imageAlt}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
