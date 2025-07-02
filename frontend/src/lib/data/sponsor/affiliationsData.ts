import { Affiliation } from '../../../models/types/sponsor';

// Placeholder affiliation data - replace with your actual affiliation logos and links
// Ensure logoSrc paths are correct (e.g., in /public/images/affiliations/)
export const affiliationsData: Affiliation[] = [
  {
    id: 1,
    name: "UF College of Medicine",
    logoSrc: "https://placehold.co/250x100/FFFFFF/0021A5?text=UF+College+of+Medicine&font=outfit", // Placeholder
    websiteUrl: "#", // Replace with actual URL
  },
  {
    id: 2,
    name: "CSSALT",
    logoSrc: "https://placehold.co/200x100/FFFFFF/FF6600?text=CSSALT&font=outfit", // Placeholder
    websiteUrl: "#",
  },
  {
    id: 3,
    name: "UF Health",
    logoSrc: "https://placehold.co/200x100/0021A5/FFFFFF?text=UF+Health&font=outfit", // Placeholder
    websiteUrl: "#",
  },
  {
    id: 4,
    name: "Mothers' Milk Bank of Florida",
    logoSrc: "https://placehold.co/200x100/FFFFFF/D2B48C?text=Mothers'+Milk+Bank&font=outfit", // Placeholder
    websiteUrl: "#",
  },
  // Add more affiliations if needed to test wrapping and spacing
];
