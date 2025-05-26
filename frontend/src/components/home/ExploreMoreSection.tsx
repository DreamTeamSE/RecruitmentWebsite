"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Import Link for navigation

// Interface for the item data
interface ExploreItemProps {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  href: string; // Link for the item
  align: 'left' | 'right'; // For staggering
}

// Data for the items
// Replace placeholder imageSrc with actual paths from your /public folder or a CDN
const exploreItemsData: ExploreItemProps[] = [
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

// Reusable Explore Item Component
const ExploreItem: React.FC<ExploreItemProps> = ({ imageSrc, imageAlt, title, href, align }) => { // Removed isLast prop
  const alignmentClass = align === 'left' ? 'md:self-start' : 'md:self-end';

  return (
    // Removed py-6 as it was for connector spacing
    <div className={`relative w-full md:w-1/2 lg:w-5/12 ${alignmentClass} group`}>
      {/* Connector elements have been removed */}

      <Link href={href} className="block">
        <div className="relative aspect-[16/10] rounded-[var(--radius)] shadow-xl overflow-hidden transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105">
          <Image
            src={imageSrc}
            alt={imageAlt}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-110"
            unoptimized={imageSrc.startsWith('https://placehold.co')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/50 transition-all duration-300 flex items-end p-4">
            <h3 className="text-xl sm:text-2xl font-semibold text-white font-sans">
              {title}
            </h3>
          </div>
        </div>
      </Link>

      {/* Connector elements have been removed */}
    </div>
  );
};


export default function ExploreMoreSection() {
  return (
    <section className="py-16 sm:py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Explore More
          </h2>
        </div>

        {/* Adjusted spacing, may need further refinement without lines */}
        <div className="relative flex flex-col items-center md:space-y-8 lg:space-y-12">
          {exploreItemsData.map((item) => ( // Removed index and isLast prop passing
            <ExploreItem
              key={item.id}
              {...item}
            />
          ))}
          {/* Central Vertical Line has been removed */}
        </div>
      </div>
    </section>
  );
}
