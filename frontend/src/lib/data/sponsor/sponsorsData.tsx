"use client";
import { Sponsor } from '@/models/types/sponsor';

// Placeholder sponsor data - replace with your actual sponsor logos and links
// Ensure logoSrc paths are correct (e.g., in /public/images/sponsors/)
export const sponsorsData: Sponsor[] = [
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
