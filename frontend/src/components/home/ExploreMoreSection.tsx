"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Import Link for navigation

import { ExploreItemProps } from '@/models/types/home';
import { exploreItemsData } from '../../lib/data/home/exploreItemsData';

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
