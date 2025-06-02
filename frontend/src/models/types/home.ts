// Interface for the item data
export interface ExploreItemProps {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  href: string; // Link for the item
  align: 'left' | 'right'; // For staggering
}

export interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
}

// Interface for the card data
export interface FeatureCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
}