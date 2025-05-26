"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

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
}

export interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  [key: string]: string;
}

export interface ApplicationDetailProps {
  application: ApplicationData;
}

export const applicationsData: ApplicationData[] = [
  {
    id: "software-fall-2025",
    name: "Software",
    term: "Fall 2025",
    description: "Develop innovative software solutions for healthcare in our Fall 2025 cohort. You'll work with modern technologies to build applications that directly impact patient care and clinical workflows.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "software-q1",
        questionText: "What programming languages are you most proficient in?",
        type: "text",
        placeholder: "e.g., Python, JavaScript, Java, C++",
        required: true,
      },
      {
        id: "software-q2",
        questionText: "Describe a software project you're proud of (personal, academic, or professional).",
        type: "textarea",
        placeholder: "Include a link to a GitHub repository if available...",
        required: true,
      },
      {
        id: "software-q3",
        questionText: "Why are you interested in applying your software skills to the healthcare domain?",
        type: "textarea",
        placeholder: "Explain your motivation and interest in this specific field...",
        required: true,
      },
    ],
  },
  {
    id: "design-fall-2025",
    name: "Design",
    term: "Fall 2025",
    description: "Join our Design branch for Fall 2025 to work on cutting-edge healthcare solutions, focusing on user experience and innovative product design.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "design-q1",
        questionText: "Describe your design experience or portfolio (link if available).",
        type: "textarea",
        placeholder: "Include links to Behance, Dribbble, personal site, or attach files later...",
        required: true,
      },
      {
        id: "design-q2",
        questionText: "Why are you passionate about design in the healthcare space?",
        type: "textarea",
        placeholder: "Explain your motivation...",
        required: true,
      },
      {
        id: "design-q3",
        questionText: "What design tools are you proficient in?",
        type: "text",
        placeholder: "e.g., Figma, Adobe XD, Sketch...",
        required: true,
      },
    ],
  },
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    description: "Our General Shadowing program for Fall 2025 offers unparalleled insights into various medical fields. Participants will have the opportunity to observe healthcare professionals in action and gain a deeper understanding of the clinical environment.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "gs-q1",
        questionText: "Tell Me About Yourself?",
        type: "textarea",
        placeholder: "Share a bit about your background, interests, and what motivates you...",
        required: true,
      },
      {
        id: "gs-q2",
        questionText: "Why Do You Want To Join Dream Team Engineering for this program?",
        type: "textarea",
        placeholder: "Explain your interest in DTE and this specific shadowing opportunity...",
        required: true,
      },
      {
        id: "gs-q3",
        questionText: "What do you hope to gain from this experience?",
        type: "textarea",
        placeholder: "Describe your expectations and learning goals...",
        required: false,
      },
    ],
  },
];

export default function ApplicationDetailPageContent({ application }: ApplicationDetailProps) {
  const [formData, setFormData] = useState<FormDataState>(() => {
    const initialData: FormDataState = {
      firstName: '',
      lastName: '',
      email: '',
    };
    application.questions?.forEach(q => {
      initialData[q.id] = '';
    });
    return initialData;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Application Submitted for:", application.name, "| Data:", formData);
    alert(`Application for "${application.name}" submitted! (Check console for data)`);
  };

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
            <div className="space-y-8 p-6 sm:p-8 rounded-[var(--radius)] border border-border shadow-sm bg-card">
              <h2 className="text-2xl font-semibold text-foreground font-serif border-b border-border pb-3 mb-6">
                Your Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                <div>
                  <label htmlFor="firstName" className="block text-md font-medium text-foreground mb-2">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-md font-medium text-foreground mb-2">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-md font-medium text-foreground mb-2">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

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
                        className="mt-1 block w-full rounded-[var(--radius)] border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 sm:text-sm p-3 bg-background text-foreground placeholder-muted-foreground/70"
                        placeholder={question.placeholder || 'Your answer...'}
                        value={formData[question.id] || ''}
                        onChange={handleInputChange}
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
                        onChange={handleInputChange}
                        required={question.required}
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
