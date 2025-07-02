"use client";
import { FeatureCardProps } from '@/models/types/home';

// Data for the feature cards
// Replace placeholder imageSrc with actual paths from your /public folder or a CDN
export const featureCardsData: FeatureCardProps[] = [
  {
    imageSrc: "https://placehold.co/600x400/E0E7FF/4A6DFF?text=Medical+Project&font=outfit",
    imageAlt: "Students working on a medical project",
    title: "Work on Real Medical Projects",
    description: "Design, code, and test tech used in hospitals. Collaborate with physicians, nurses, and engineers to create solutions that improve real patient care.",
  },
  {
    imageSrc: "https://placehold.co/600x400/E0E7FF/4A6DFF?text=Design+Code+Research&font=outfit",
    imageAlt: "Exploring design, code, or research",
    title: "Explore Design, Code, or Research",
    description: "Join a branch that fits your skills and goals. From 3D modeling to software engineering to hands-on clinical testing—we have a place for you.",
  },
  {
    imageSrc: "https://placehold.co/600x400/E0E7FF/4A6DFF?text=Learn+Lead+Grow&font=outfit",
    imageAlt: "Students learning and leading",
    title: "Learn, Lead, and Grow",
    description: "Programs built for all levels. Whether you're just getting started or ready to lead, our mentorship and shadowing programs support your growth.",
  },
  
];
