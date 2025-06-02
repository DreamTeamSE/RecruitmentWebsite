"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

import { ApplicationDetailProps } from '@/models/types/application';
import { useApplicationForm } from '@/lib/hooks/useApplicationForm';

export default function ApplicationDetailPageContent({ application }: ApplicationDetailProps) {
  const { formData, handleInputChange, handleSubmit } = useApplicationForm(application);

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

        {application.status === 'open' && (
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Info Section */}
            <div className="space-y-8 p-6 sm:p-8 rounded-[var(--radius)] border border-border shadow-sm bg-card">
              <h2 className="text-2xl font-semibold text-foreground font-serif border-b border-border pb-3 mb-6">
                Your Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                {['firstName', 'lastName'].map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-md font-medium text-foreground mb-2 capitalize">
                      {field === 'firstName' ? 'First Name' : 'Last Name'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      name={field}
                      id={field}
                      required
                      value={formData[field]}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                      placeholder={`Enter your ${field === 'firstName' ? 'first' : 'last'} name`}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="email" className="block text-md font-medium text-foreground mb-2">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Dynamic Questions */}
            {application.questions && application.questions.length > 0 && (
              <div className="space-y-8 p-6 sm:p-8 rounded-[var(--radius)] border border-border shadow-sm bg-card mt-10">
                <h2 className="text-2xl font-semibold text-foreground font-serif border-b border-border pb-3 mb-6">
                  Application Questions
                </h2>
                {application.questions.map((question) => (
                  <div key={question.id} className="mb-8">
                    <label htmlFor={question.id} className="block text-xl sm:text-2xl font-semibold text-foreground font-serif mb-4">
                      {question.questionText}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    {question.type === 'textarea' ? (
                      <textarea
                        id={question.id}
                        name={question.id}
                        rows={5}
                        required={question.required}
                        value={formData[question.id] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                        placeholder={question.placeholder || 'Your answer...'}
                      />
                    ) : (
                      <input
                        type="text"
                        id={question.id}
                        name={question.id}
                        required={question.required}
                        value={formData[question.id] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                        placeholder={question.placeholder || 'Your answer...'}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 text-center">
              <Button type="submit" size="lg" className="rounded-md px-10 py-3 text-lg">
                Submit Application
              </Button>
            </div>
          </form>
        )}

        {/* Status Notes */}
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
              Application questions for {application.name} | {application.term} will be available soon. Please check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
