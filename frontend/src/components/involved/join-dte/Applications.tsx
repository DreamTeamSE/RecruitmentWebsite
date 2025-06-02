"use client";

import React from 'react';
import Link from 'next/link'; // For making application names clickable (optional)
// You might want an icon for an "Apply Now" button or similar if needed
// import { ArrowRight } from 'lucide-react';

import { Application } from '@/models/types/application';
import { filledApplicationData } from '@/lib/data/application/application';

const ApplicationCard: React.FC<Application> = ({ name, term, deadline, closedDate, status, href }) => {
  return (
    <Link href={href} className="block group">
      <div className="bg-background p-4 sm:p-6 rounded-[var(--radius)] shadow-md hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-base sm:text-lg font-semibold text-primary group-hover:underline mb-1">
          {name} | {term}
        </h3>
        {status === 'open' && deadline && (
          <p className="text-sm text-muted-foreground">Deadline: {deadline}</p>
        )}
        {status === 'closed' && closedDate && (
          <p className="text-sm text-muted-foreground">Closed: {closedDate}</p>
        )}
      </div>
    </Link>
  );
};

export default function ApplicationsSection() {
  const openApplications = filledApplicationData.filter(app => app.status === 'open');
  const closedApplications = filledApplicationData.filter(app => app.status === 'closed');

  return (
    // Section background matches the image (very light lavender/gray)
    <section className="py-16 sm:py-24 bg-[#F3F4F9]"> {/* Explicit light purple background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Open Applications */}
        {openApplications.length > 0 && (
          <div className="mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-serif">
                Open Applications
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {openApplications.map((app) => (
                <ApplicationCard key={app.id} {...app} />
              ))}
            </div>
          </div>
        )}

        {/* Closed Applications */}
        {closedApplications.length > 0 && (
          <div>
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-serif">
                Closed Applications
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {closedApplications.map((app) => (
                <ApplicationCard key={app.id} {...app} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
