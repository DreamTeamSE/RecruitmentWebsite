"use client";

import React from 'react';
import Image from 'next/image'; // Using Next.js Image component

// Placeholder image data - replace with your actual image sources
// You should replace these with actual image paths from your /public folder or a CDN.
const baseCarouselImages = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  // Using a consistent placeholder image. Adjusted size for better fit in a strip.
  src: `https://placehold.co/400x300/E0E7FF/4A6DFF?text=Image+${i + 1}&font=outfit`,
  alt: `Carousel Image ${i + 1}`,
}));

// Duplicate images for seamless looping effect in marquee
const marqueeImages = [...baseCarouselImages, ...baseCarouselImages];

export default function ImageCarouselSection() {
  if (!baseCarouselImages || baseCarouselImages.length === 0) {
    return (
      <section className="py-12 sm:py-16 bg-background text-center">
        <p className="text-foreground">No images to display.</p>
      </section>
    );
  }

  // Calculate animation duration based on number of images to keep speed consistent
  // Adjust speedFactor to make it faster or slower.
  // Lower value = faster scroll. Higher value = slower scroll.
  const speedFactor = 40; // Reduced from 100 to make it faster
  const animationDuration = `${baseCarouselImages.length * speedFactor * 0.2}s`; // Total duration for one loop of the duplicated set

  return (
    <section className="py-8 sm:py-12 bg-muted/50 w-full overflow-hidden"> {/* Using muted for a light background */}
      {/* Removed container mx-auto and px-0 sm:px-4 to make it full width */}
      <div className="w-full group"> {/* Removed max-w-full and mx-auto */}
        {/* Marquee Container */}
        <div className="overflow-hidden whitespace-nowrap">
          <div
            className="flex animate-marquee group-hover:pause-animation" // Using flex for inline layout
            style={{ animationDuration }} // Apply dynamic duration
          >
            {marqueeImages.map((image, index) => (
              <div
                key={`${image.id}-${index}`} // Ensure unique keys for duplicated images
                className="flex-shrink-0 w-auto h-48 sm:h-56 md:h-64 mx-2" // Adjusted height, auto width, added margin
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={400} // Provide explicit width for aspect ratio calculation
                  height={300} // Provide explicit height
                  objectFit="cover"
                  className="rounded-lg shadow-md h-full w-full" // Ensure image fills its div
                  unoptimized={image.src.startsWith('https://placehold.co')}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* CSS for marquee animation */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); } /* Scroll one full set of original images */
        }
        .animate-marquee {
          animation: marquee linear infinite;
          /* animation-play-state: running; // Handled by group-hover:pause-animation */
        }
        .pause-animation {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
