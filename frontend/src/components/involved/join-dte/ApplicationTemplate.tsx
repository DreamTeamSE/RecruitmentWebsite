// src/components/Involved/join-dte/ApplicationTemplate.tsx
"use client"; // This component handles state, so it's a Client Component

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
// Make sure to define or import these types from a shared location if they are not here
// For this consolidated example, they are defined in the page.tsx that imports this.
// Ideally, ApplicationData and ApplicationQuestion would be in a shared types file.

export interface ApplicationQuestion {
  id: string;
  questionText: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

export interface ApplicationData {
  id: string;
  name: string;
  term: string;
  description: string;
  status?: 'open' | 'closed';
  deadline?: string;
  closedDate?: string;
  questions?: ApplicationQuestion[];
  // applyLink: string; // Kept for data integrity, though button was removed
}

interface ApplicationDetailProps {
  application: ApplicationData; // Expects the full ApplicationData object
}

export default function ApplicationDetailPageContent({ application }: ApplicationDetailProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initialData: Record<string, string> = {};
    application.questions?.forEach(q => {
      initialData[q.id] = '';
    });
    return initialData;
  });

  const handleInputChange = (questionId: string, value: string) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Application Submitted for:", application.name, "| Data:", formData);
    alert(`Application for "${application.name}" submitted (check console for data)!`);
    // Implement actual submission logic here
  };

  if (!application) {
    return <p>Application data is not available.</p>; // Or some other loading/error state
  }

  return (
    <div className="py-12 sm:py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-left mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground font-serif">
            {application.name} <span className="text-primary">|</span> {application.term}
          </h1>
        </div>

        <div className="mb-10 sm:mb-12">
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {application.description}
          </p>
        </div>

        {application.status === 'open' && application.questions && application.questions.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-10">
            {application.questions.map((question) => (
              <div key={question.id}>
                <label htmlFor={question.id} className="block text-xl sm:text-2xl font-semibold text-foreground font-serif mb-3">
                  {question.questionText}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {question.type === 'textarea' ? (
                  <textarea
                    id={question.id}
                    name={question.id}
                    rows={5}
                    className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                    placeholder={question.placeholder || 'Your answer...'}
                    value={formData[question.id] || ''}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    required={question.required}
                  />
                ) : (
                  <input
                    type="text"
                    id={question.id}
                    name={question.id}
                    className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                    placeholder={question.placeholder || 'Your answer...'}
                    value={formData[question.id] || ''}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    required={question.required}
                  />
                )}
              </div>
            ))}
            <div className="pt-6 text-center">
              <Button type="submit" size="lg" className="rounded-md px-10 py-3 text-lg">
                Submit Application
              </Button>
            </div>
          </form>
        )}

        {application.status === 'closed' && application.closedDate && (
          <div className="text-center p-6 bg-muted rounded-[var(--radius)] shadow-md mt-10">
            <p className="text-lg text-muted-foreground font-semibold">
              Applications for {application.name} | {application.term} are currently closed.
              <br />
              (Closed on: {application.closedDate})
            </p>
          </div>
        )}
        {application.status === 'open' && (!application.questions || application.questions.length === 0) && (
           <div className="text-center p-6 bg-muted rounded-[var(--radius)] shadow-md mt-10">
            <p className="text-lg text-muted-foreground font-semibold">
              Application details and questions for {application.name} | {application.term} will be available soon. Please check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
