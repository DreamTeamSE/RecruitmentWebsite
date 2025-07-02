"use client";
import { SponsorshipTier } from '@/models/types/sponsor';

// Data for the sponsorship tiers
// Replace logoSrc with the actual path to your small heart logo if different
export const sponsorshipTiersData: SponsorshipTier[] = [
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
