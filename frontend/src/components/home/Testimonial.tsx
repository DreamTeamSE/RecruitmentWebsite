"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTestimonialsSlider } from '@/lib/hooks/useTestimonalSlider';

export default function TestimonialsSection() {
  const {
    currentTestimonial,
    goToPrevious,
    goToNext,
    hasMultiple,
  } = useTestimonialsSlider();

  if (!currentTestimonial) return null;

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Testimonials
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="relative min-h-[200px] sm:min-h-[220px] flex flex-col items-center justify-center text-center px-8 sm:px-12">
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

          {hasMultiple && (
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
