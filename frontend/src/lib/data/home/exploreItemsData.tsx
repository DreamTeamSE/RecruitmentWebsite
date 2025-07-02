"use client";
import { ExploreItemProps } from '@/models/types/home';

// Data for the items
// Replace placeholder imageSrc with actual paths from your /public folder or a CDN
export const exploreItemsData: ExploreItemProps[] = [
  {
    id: "design",
    imageSrc: "https://placehold.co/600x400/A5B4FC/FFFFFF?text=Design&font=outfit",
    imageAlt: "Design team working",
    title: "Design",
    href: "/branches/design", // Example link
    align: 'left',
  },
  {
    id: "software",
    imageSrc: "https://placehold.co/600x400/A5B4FC/FFFFFF?text=Software&font=outfit",
    imageAlt: "Software development screen",
    title: "Software",
    href: "/branches/software", // Example link
    align: 'right',
  },
  {
    id: "research",
    imageSrc: "https://placehold.co/600x400/A5B4FC/FFFFFF?text=Research&font=outfit",
    imageAlt: "Researcher pointing at a graph",
    title: "Research",
    href: "/branches/research", // Example link
    align: 'left',
  },
  {
    id: "shadowing",
    imageSrc: "https://placehold.co/600x400/A5B4FC/FFFFFF?text=Shadowing&font=outfit",
    imageAlt: "Group photo representing shadowing",
    title: "Shadowing",
    href: "/branches/shadowing", // Example link
    align: 'right',
  },
];
