// src/components/review/IndividualApplicantReviewDisplay.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from 'lucide-react';
// Assuming types are in a shared file, adjust path if they are defined elsewhere
// These types should match those defined in your data source (e.g., applicantReviewDetailData.ts)
import type { IndividualReviewPageDisplayData, ApplicantAnswer, ApplicationQuestion } from '@/lib/data/applicantIDData'; // Adjust path as needed
import { useRouter } from 'next/navigation'; // For client-side navigation

interface IndividualApplicantReviewDisplayProps {
  reviewData: IndividualReviewPageDisplayData;
  // The applicationId is the ID of the application type (e.g., "software-fall-2025")
  // It's needed to construct correct URLs for prev/next navigation.
  applicationTypeId: string;
}

export default function IndividualApplicantReviewDisplay({ reviewData, applicationTypeId }: IndividualApplicantReviewDisplayProps) {
  const { applicationName, applicationTerm, applicantSubmission, applicationQuestions, previousApplicantSubmissionId, nextApplicantSubmissionId } = reviewData;
  const router = useRouter();

  // State for reviewer's notes and score
  const [notes, setNotes] = useState(applicantSubmission.currentNotes || '');
  const [score, setScore] = useState(applicantSubmission.currentScore || '');

  // Update local state if the applicantSubmission prop changes (e.g., when navigating between applicants)
  useEffect(() => {
    setNotes(applicantSubmission.currentNotes || '');
    setScore(applicantSubmission.currentScore || '');
  }, [applicantSubmission]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    // TODO: Implement debounced save or save on blur/button click for notes
    // Example: onSaveNotes(applicantSubmission.id, e.target.value);
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScore(e.target.value);
    // TODO: Implement debounced save or save on blur/button click for score
    // Example: onSaveScore(applicantSubmission.id, e.target.value);
  };
  
  // Helper function to find an applicant's answer for a given question ID
  const findAnswer = (questionId: string): string => {
    const foundAnswer = applicantSubmission.answers.find(ans => ans.questionId === questionId);
    return foundAnswer ? foundAnswer.answer : "No answer provided for this question.";
  };

  const handleSaveReview = () => {
    // TODO: Implement actual API call to save notes and score to your backend.
    // This would typically involve sending applicantSubmission.id, notes, and score.
    console.log("Saving review for applicant:", applicantSubmission.id, "in application type:", applicationTypeId, { notes, score });
    alert("Review saved (check console for data)! This is a demo and data is not persisted.");
    // You might want to provide feedback to the user, e.g., a success toast.
  };

  const navigateToApplicant = (targetApplicantSubmissionId?: string) => {
    if (targetApplicantSubmissionId) {
      // Construct the URL for the target applicant within the same application type
      router.push(`/applications-review/${applicationTypeId}/${targetApplicantSubmissionId}`);
    }
  };

  return (
    // Overall section with a light purple background, matching the screenshot
    <section className="py-12 sm:py-16 bg-[#F3F4F9] min-h-screen"> {/* Using explicit light purple from image */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl"> {/* Constrained width */}
        
        {/* Header: Application Name | Term */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground font-serif">
            {applicationName} <span className="text-primary">|</span> {applicationTerm}
          </h1>
        </div>

        {/* Main content card: White background, rounded corners, shadow */}
        <div className="bg-background p-6 sm:p-8 rounded-[var(--radius)] shadow-xl space-y-8"> {/* Using theme variables */}
          
          {/* Applicant's First Name & Last Name (Read-only) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={applicantSubmission.firstName}
                readOnly
                className="mt-1 block w-full rounded-md border-border bg-muted/30 p-3 text-foreground sm:text-sm cursor-default"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={applicantSubmission.lastName}
                readOnly
                className="mt-1 block w-full rounded-md border-border bg-muted/30 p-3 text-foreground sm:text-sm cursor-default"
              />
            </div>
          </div>

          {/* Display Questions and Applicant's Answers */}
          {applicationQuestions.map((question) => (
            <div key={question.id}>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground font-serif mb-2">
                {question.questionText}
              </h3>
              {/* Answer display box */}
              <div className="p-3 sm:p-4 border border-border rounded-md bg-muted/30 min-h-[100px] text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {findAnswer(question.id)}
              </div>
            </div>
          ))}

          {/* Reviewer Notes Section */}
          <div>
            <label htmlFor="reviewerNotes" className="block text-lg sm:text-xl font-semibold text-foreground font-serif mb-2">
              Notes
            </label>
            <textarea
              id="reviewerNotes"
              rows={5}
              value={notes}
              onChange={handleNotesChange}
              placeholder="Your review notes for this applicant..."
              className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 p-3 bg-background text-foreground placeholder-muted-foreground/70 sm:text-sm"
            />
          </div>

          {/* Reviewer Score Section */}
          <div>
            <label htmlFor="reviewerScore" className="block text-lg sm:text-xl font-semibold text-foreground font-serif mb-2">
              Score
            </label>
            <input
              type="text" // Could be "number" if you want to enforce numeric input, but "text" is flexible for "10/10"
              id="reviewerScore"
              value={score}
              onChange={handleScoreChange}
              placeholder="e.g., 9/10 or 95%"
              className="mt-1 block w-full sm:w-1/2 md:w-1/3 rounded-md border-border shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 p-3 bg-background text-foreground placeholder-muted-foreground/70 sm:text-sm"
            />
          </div>
           
           {/* Save Review Button */}
           <div className="pt-4 text-center">
              <Button onClick={handleSaveReview} size="lg" className="rounded-md px-10 py-3 text-lg">
                Save Review
              </Button>
            </div>
        </div>

        {/* Navigation Arrows for Previous/Next Applicant */}
        <div className="flex justify-between items-center mt-10 sm:mt-12">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigateToApplicant(previousApplicantSubmissionId)} 
            disabled={!previousApplicantSubmissionId} 
            className="rounded-md bg-background text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Previous Applicant
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigateToApplicant(nextApplicantSubmissionId)} 
            disabled={!nextApplicantSubmissionId} 
            className="rounded-md bg-background text-foreground hover:bg-muted/50"
          >
            Next Applicant <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
