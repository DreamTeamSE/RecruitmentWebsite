
export interface Affiliation {
  id: number;
  name: string;
  logoSrc: string;
  websiteUrl: string; // Link to affiliation's website
}
export interface Sponsor {
  id: number;
  name: string;
  logoSrc: string;
  websiteUrl: string; // Link to sponsor's website
}export interface SponsorshipTier {
  id: string;
  logoSrc: string; // Path to the small logo
  title: string;
  amount: string;
  benefits: Benefit[];
  borderColorClass: string; // To match the light blue outline from the image
  textColorClass?: string; // Optional if specific text color needed for title
}
export interface Benefit {
  id: number;
  text: string;
}

