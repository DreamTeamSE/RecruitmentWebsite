"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactSection() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Contact Us
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Have questions about Dream Team Engineering? We&apos;d love to hear from you.
              Reach out to us through any of the methods below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Email */}
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Email</h3>
              <p className="text-muted-foreground mb-3">
                Send us an email for general inquiries
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => window.location.href = 'mailto:contact@dreamteamengineering.org'}
              >
                contact@dreamteamengineering.org
              </Button>
            </div>

            {/* Location */}
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Location</h3>
              <p className="text-muted-foreground mb-3">
                University of Florida
              </p>
              <p className="text-sm text-muted-foreground">
                Gainesville, FL 32611
              </p>
            </div>

            {/* Phone */}
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Phone</h3>
              <p className="text-muted-foreground mb-3">
                Call us during business hours
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => window.location.href = 'tel:+1-352-555-0123'}
              >
                (352) 555-0123
              </Button>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <p className="text-muted-foreground mb-6">
              Interested in joining our team or learning more about our projects?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="default"
                size="lg"
                className="rounded-full px-8"
                onClick={() => window.location.href = '/get-involved/join-dte'}
              >
                Apply Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-2 border-primary text-primary hover:bg-primary/10 px-8"
                onClick={() => window.location.href = '/get-involved/about-us'}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}