"use client";

import React from 'react';
import Link from 'next/link';
import { ApplicationFormData, fetchForms } from '@/lib/data/application/forms';

const FormApplicationCard: React.FC<ApplicationFormData> = ({ id, title, description, created_at }) => {
  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Link href={`/get-involved/join-dte/${id}`} className="block group">
      <div className="bg-background p-4 sm:p-6 rounded-[var(--radius)] shadow-md hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-base sm:text-lg font-semibold text-primary group-hover:underline mb-1">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">Created: {formattedDate}</p>
      </div>
    </Link>
  );
};

export default function ApplicationsSection() {
  const [forms, setForms] = React.useState<ApplicationFormData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadForms = async () => {
      try {
        const formsData = await fetchForms();
        setForms(formsData);
        setError(null);
      } catch (error) {
        setError('Failed to load application forms. Please try again later.');
        console.error('Error loading forms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadForms();
  }, []);

  const handleCardClick = (formId: number) => {
    window.location.href = `/get-involved/join-dte/${formId}`;
  };

  if (isLoading) {
    return (
      <section className="py-16 sm:py-24 bg-[#F3F4F9]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 sm:py-24 bg-[#F3F4F9]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24 bg-[#F3F4F9]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-serif">
            Available Applications
          </h2>
          <p className="text-muted-foreground mt-4">Apply to join our team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => handleCardClick(form.id)}
              className="block group bg-background p-4 sm:p-6 rounded-[var(--radius)] shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <h3 className="text-base sm:text-lg font-semibold text-primary group-hover:underline mb-1">
                {form.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">{form.description}</p>
              <p className="text-sm text-muted-foreground">Created: {new Date(form.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        {forms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No applications available at this time.</p>
          </div>
        )}
      </div>
    </section>
  );
}
