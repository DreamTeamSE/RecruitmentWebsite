// src/app/get-involved/join-dte/[applicationId]/page.tsx
"use client";

import React, { useState } from 'react';
import { notFound } from 'next/navigation';
import { Button } from "@/components/ui/button";

// --- Data Definitions and Data ---

export interface ApplicationQuestion {
  id: string; // Unique ID for the question (e.g., "q1-experience")
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
  questions?: ApplicationQuestion[]; // Array of application questions
  // applyLink?: string; // This was part of the original data but not used in the current display template
}

// IMPORTANT: Populate this with your actual application data and questions.
export const applicationsData: ApplicationData[] = [
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    description: "Our General Shadowing program for Fall 2025 offers unparalleled insights into various medical fields. Participants will have the opportunity to observe healthcare professionals in action and gain a deeper understanding of the clinical environment.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      { id: "gs-q1", questionText: "Tell Me About Yourself?", type: "textarea", placeholder: "Share a bit about your background, interests, and what motivates you...", required: true },
      { id: "gs-q2", questionText: "Why Do You Want To Join Dream Team Engineering for this program?", type: "textarea", placeholder: "Explain your interest in DTE and this specific shadowing opportunity...", required: true },
      { id: "gs-q3", questionText: "What do you hope to gain from this experience?", type: "textarea", placeholder: "Describe your expectations and learning goals...", required: false },
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
      { id: "design-q1", questionText: "Describe your design experience or portfolio (link if available).", type: "textarea", placeholder: "Include links to Behance, Dribbble, personal site, or attach files later...", required: true },
      { id: "design-q2", questionText: "Why are you passionate about design in the healthcare space?", type: "textarea", placeholder: "Explain your motivation...", required: true },
      { id: "design-q3", questionText: "What design tools are you proficient in?", type: "text", placeholder: "e.g., Figma, Adobe XD, Sketch...", required: true },
    ],
  },
  {
    id: "research-fall-2025",
    name: "Research",
    term: "Fall 2025",
    description: "Contribute to impactful healthcare research in our Fall 2025 program by exploring innovative solutions and analyzing data to improve patient outcomes.",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "research-q1", questionText: "What research areas are you most interested in within healthcare technology?", type: "textarea", placeholder: "Be specific about topics or methodologies...", required: true },
        { id: "research-q2", questionText: "Describe any previous research experience you have (coursework, projects, publications).", type: "textarea", placeholder: "Detail your roles and contributions...", required: false },
        { id: "research-q3", questionText: "How do you approach problem-solving in a research context?", type: "textarea", placeholder: "Describe your methodology or thought process...", required: true },
    ],
  },
  {
    id: "software-fall-2025",
    name: "Software",
    term: "Fall 2025",
    description: "Develop innovative software solutions for healthcare in our Fall 2025 cohort. You'll work with modern technologies to build applications that directly impact patient care and clinical workflows.",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "software-q1", questionText: "What programming languages are you most proficient in?", type: "text", placeholder: "e.g., Python, JavaScript, Java, C++", required: true },
        { id: "software-q2", questionText: "Describe a software project you're proud of (personal, academic, or professional).", type: "textarea", placeholder: "Include a link to a GitHub repository if available...", required: true },
        { id: "software-q3", questionText: "Why are you interested in applying your software skills to the healthcare domain?", type: "textarea", placeholder: "Explain your motivation and interest in this specific field...", required: true },
    ],
  },
  {
    id: "stem-events-fall-2025",
    name: "Stem Special Events",
    term: "Fall 2025",
    description: "Participate and organize STEM special events with us in Fall 2025. Help us promote innovation and engagement within the STEM community at UF.",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "stem-q1", questionText: "What experience do you have in event planning or coordination?", type: "textarea", placeholder: "Describe any relevant roles or activities...", required: false },
        { id: "stem-q2", questionText: "Why are you interested in contributing to STEM outreach and events?", type: "textarea", placeholder: "Share your motivations...", required: true },
        { id: "stem-q3", questionText: "Suggest one idea for a STEM special event DTE could host.", type: "textarea", placeholder: "Briefly outline your concept...", required: true },
    ],
  },
  {
    id: "gs-fall-2024",
    name: "General Shadowing",
    term: "Fall 2024",
    description: "The General Shadowing program for Fall 2024 has concluded.",
    status: "closed",
    closedDate: "9/10/24",
    questions: [], // No questions for closed applications, or could show past questions if desired
  },
];

// --- Application Detail Display Component ---
interface ApplicationDisplayProps {
  application: ApplicationData;
}

function ApplicationDisplay({ application }: ApplicationDisplayProps) {
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
    // TODO: Implement actual form submission logic (e.g., send to API, email service)
    console.log("Application Submitted for:", application.name, "| Data:", formData);
    alert(`Application for "${application.name}" submitted! (Check console for data)`);
    // Optionally, clear form or redirect after submission
  };

  return (
    <div className="py-12 sm:py-16 bg-background"> {/* Page background should be white */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="text-left mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground font-serif">
            {application.name} <span className="text-primary">|</span> {application.term}
          </h1>
        </div>

        {/* Description Section */}
        <div className="mb-10 sm:mb-12">
          {/* No explicit "Description" title, text flows directly */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {application.description}
          </p>
        </div>

        {/* Application Questions Form */}
        {application.status === 'open' && application.questions && application.questions.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-10"> {/* Increased space between questions */}
            {application.questions.map((question) => (
              <div key={question.id} className="mb-8"> {/* Added margin-bottom to each question block */}
                <label htmlFor={question.id} className="block text-xl sm:text-2xl font-semibold text-foreground font-serif mb-4"> {/* Styled question text as a heading */}
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
                ) : ( // Assuming 'text' type
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
              Application questions for {application.name} | {application.term} will be available soon. Please check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


interface PageProps {
  params: {
    applicationId: string;
  };
}

export default function Page({ params }: PageProps) {
  const { applicationId } = params;
  const application = applicationsData.find(app => app.id === applicationId);

  if (!application) {
    notFound();
  }

  return (
    <>
      <ApplicationDisplay application={application} />
    </>
  );
}
