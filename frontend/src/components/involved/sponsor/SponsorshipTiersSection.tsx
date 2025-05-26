"use client";

import React from 'react';
import Image from 'next/image'; // For the logo in each card

interface Benefit {
  id: number;
  text: string;
}

interface SponsorshipTier {
  id: string;
  logoSrc: string; // Path to the small logo
  title: string;
  amount: string;
  benefits: Benefit[];
  borderColorClass: string; // To match the light blue outline from the image
  textColorClass?: string; // Optional if specific text color needed for title
}

// Data for the sponsorship tiers
// Replace logoSrc with the actual path to your small heart logo if different
const sponsorshipTiersData: SponsorshipTier[] = [
  {
    id: "bronze",
    logoSrc: "/transparent_heart.png", // Assuming this is your small logo
    title: "Bronze Sponsors",
    amount: "$250",
    benefits: [
      { id: 1, text: "Spot on the official Dream Team Engineering website" },
      { id: 2, text: "Merchandise" },
    ],
    borderColorClass: "border-secondary-accent", // Uses --secondary-accent for the light blue
  },
  {
    id: "silver",
    logoSrc: "/transparent_heart.png",
    title: "Silver Sponsors",
    amount: "$500",
    benefits: [
      { id: 1, text: "Bronze Tier Benefits" },
      { id: 2, text: "Host a recruitment event" },
    ],
    borderColorClass: "border-secondary-accent",
  },
  {
    id: "gold",
    logoSrc: "/transparent_heart.png",
    title: "Gold Sponsors",
    amount: "$1000",
    benefits: [
      { id: 1, text: "Silver Tier Benefits" },
      { id: 2, text: "Access to the member resume bank" },
    ],
    borderColorClass: "border-secondary-accent",
  },
  {
    id: "diamond",
    logoSrc: "/transparent_heart.png",
    title: "Diamond Sponsors",
    amount: "$1500",
    benefits: [
      { id: 1, text: "Gold Tier Benefits" },
      { id: 2, text: "Co-host a General Body Meeting" },
      { id: 3, text: "Spot on DTE's industry advisory board" },
    ],
    borderColorClass: "border-secondary-accent",
  },
];

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
