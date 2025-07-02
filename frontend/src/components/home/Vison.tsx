"use client";

import React from 'react';
import { Button } from "@/components/ui/button"; // Assuming this uses your best practice buttonVariants
import { ArrowRight } from 'lucide-react';

// This component will rely on your global.css for theming:
// - Section background: var(--background) -> bg-background (white)
// - Subtitle text: A lighter gray, e.g., text-gray-500 or a specific theme variable if available
// - Heading text: var(--foreground) -> text-foreground (black), font-family: var(--font-serif) from h1 styles
// - "Join Today" button: variant="default" -> bg-primary, text-primary-foreground
// - "Learn More" button: Custom styled with black border and text
// - Border radius: var(--radius) -> rounded-full for these buttons

export default function HeroSection() {
  return (
    // Section uses 'bg-background' from your theme for the background (white)
    <section className={`py-16 sm:py-24 bg-background`}>
      <div className="container mx-auto px-4 text-center">
        {/* Subtitle uses a lighter gray. text-muted-foreground might be too dark.
            Using text-gray-500 as an example, or adjust your --muted-foreground if preferred.
            Font should be var(--font-sans) by default. */}
        <h2 className={`text-base sm:text-lg font-medium text-gray-500 mb-3 sm:mb-4 tracking-wide`}>
          From Vision to Impact
        </h2>
        {/* Main heading uses 'text-foreground'. Font family should be var(--font-serif) from global h1 styles. */}
        {/* Text sizes are from your global.css h1 styles. */}
        <h3 className={`max-w-3xl mx-auto`}>
          We&apos;re a team of students designing thoughtful technology
          to make healthcare better for patients and providers.
        </h3>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="default" // Uses bg-primary, text-primary-foreground. Ensure --primary is the purple-blue.
            size="lg"        // Uses h-11, px-8 from your buttonVariants
            className="rounded-full group px-6" // Explicitly px-6 for padding control
            onClick={() => console.log("Join Today clicked")}
          >
            Join Today
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            // Custom styling for a black outline button
            size="lg" // Uses h-11, px-8 from your buttonVariants
            // Using explicit black border and text, bg-transparent is default for no bg class
            className="rounded-full border-2 border-black text-black bg-transparent hover:bg-gray-100 group px-6" // Explicitly px-6
            onClick={() => console.log("Learn More clicked")}
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
