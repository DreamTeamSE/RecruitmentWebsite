"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
}

// Placeholder testimonial data - replace with your actual testimonials
const testimonialsData: Testimonial[] = [
  {
    id: 1,
    quote: "Dream Team Engineering is a great avenue for working on projects with a tangible impact on patients lives while also making lasting friends along the way!",
    author: "Pavitpaul Makkar",
    role: "Urine Output Team Member",
  },
  {
    id: 2,
    quote: "Being a part of DTE has been an incredible learning experience. The collaborative environment and real-world projects are unparalleled.",
    author: "Jane Doe",
    role: "Software Branch Lead",
  },
  {
    id: 3,
    quote: "I've grown so much as a designer and a leader here. The mentorship opportunities are fantastic.",
    author: "John Smith",
    role: "Design Team Member",
  },
  {
    id: 4,
    quote: "The hands-on research and direct interaction with healthcare professionals have been invaluable for my career aspirations.",
    author: "Alice Brown",
    role: "Research Branch Member",
  },
];

const AUTOPLAY_INTERVAL = 30000; // 30 seconds

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? testimonialsData.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    const isLastSlide = currentIndex === testimonialsData.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (testimonialsData.length <= 1) return; // No autoplay if 1 or no testimonials

    const timer = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer); // Cleanup interval on component unmount
  }, [currentIndex, goToNext]); // Re-run effect if currentIndex or goToNext changes

  if (!testimonialsData || testimonialsData.length === 0) {
    return null; // Don't render section if no testimonials
  }

  const currentTestimonial = testimonialsData[currentIndex];

  return (
    // Section uses 'bg-muted/30' for a very light background, similar to image
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          {/* Title uses 'text-foreground' and should pick up h2 styles from global.css */}
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Testimonials
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Testimonial Content */}
          <div className="relative min-h-[200px] sm:min-h-[220px] flex flex-col items-center justify-center text-center px-8 sm:px-12">
            {/* Using a key on the quote div to force re-render on change for transition */}
            <div key={currentTestimonial.id} className="animate-fadeIn">
              <p className="text-lg sm:text-xl md:text-2xl italic text-foreground leading-relaxed">
                &ldquo;{currentTestimonial.quote}&rdquo;
              </p>
              <p className="mt-6 text-base font-semibold text-foreground">
                {currentTestimonial.author}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentTestimonial.role}
              </p>
            </div>
          </div>

          {/* Navigation Buttons (only if more than one testimonial) */}
          {testimonialsData.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                aria-label="Previous testimonial"
                className="absolute top-1/2 left-[-20px] sm:left-[-30px] md:left-[-50px] transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
              >
                <ChevronLeft size={32} className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>

              <button
                onClick={goToNext}
                aria-label="Next testimonial"
                className="absolute top-1/2 right-[-20px] sm:right-[-30px] md:right-[-50px] transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
              >
                <ChevronRight size={32} className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* CSS for fadeIn animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0.3; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-in-out;
        }
      `}</style>
    </section>
  );
}
