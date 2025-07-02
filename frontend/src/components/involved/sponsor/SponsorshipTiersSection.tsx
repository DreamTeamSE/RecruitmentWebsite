"use client";

import React from 'react';
import Image from 'next/image'; // For the logo in each card
import { SponsorshipTier } from '@/models/types/sponsor';
import { sponsorshipTiersData } from '../../../lib/data/sponsor/sponsorshipTiersData';

// Reusable Sponsorship Tier Card Component
const TierCard: React.FC<SponsorshipTier> = ({ logoSrc, title, amount, benefits, borderColorClass, textColorClass }) => {
  return (
    <div className={`bg-card p-6 rounded-[var(--radius)] border-2 ${borderColorClass} shadow-lg flex flex-col h-full`}>
      <div className="flex items-center mb-4">
        <div className="relative w-8 h-8 mr-3 sm:w-10 sm:h-10"> {/* Adjusted logo size */}
          <Image
            src={logoSrc}
            alt="DTE Logo"
            layout="fill"
            objectFit="contain"
          />
        </div>
        <h3 className={`text-lg sm:text-xl font-semibold ${textColorClass || 'text-foreground'} font-serif`}>
          {title} ({amount}):
        </h3>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Benefits:</p>
        <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
          {benefits.map((benefit) => (
            <li key={benefit.id}>{benefit.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default function SponsorshipTiersSection() {
  return (
    // Section uses 'bg-background' for a white background as per the image
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          {/* Title uses 'text-foreground' and should pick up h2 styles from global.css */}
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Sponsorship Tiers
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {sponsorshipTiersData.map((tier) => (
            <TierCard
              key={tier.id}
              {...tier}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
