// src/components/review/IndividualApplicantReviewDisplay.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import axios from 'axios';
// Assuming types are in a shared file, adjust path if they are defined elsewhere
// These types should match those defined in your data source (e.g., applicantReviewDetailData.ts)
import type { IndividualApplicantReviewDisplayProps } from '@/models/types/application'; // Adjust path as needed



export default function IndividualApplicantReviewDisplay({ reviewData, applicationTypeId }: IndividualApplicantReviewDisplayProps) {
  const { applicationName, applicationDescription, applicantSubmission, applicationQuestions } = reviewData;

  // State for reviewer's notes and score
  const [notes, setNotes] = useState(applicantSubmission.currentNotes || '');
  const [score, setScore] = useState(applicantSubmission.currentScore || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
    const value = e.target.value;
    
    // Allow empty string for user to clear the field
    if (value === '') {
      setScore('');
      return;
    }
    
    // Convert to number and validate range
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
      setScore(value);
    }
    // If invalid, don't update the state (prevents invalid input)
  };
  
  // Helper function to find an applicant's answer for a given question ID
  const findAnswer = (questionId: string): string => {
    const foundAnswer = applicantSubmission.answers.find(ans => ans.questionId === questionId);
    return foundAnswer ? foundAnswer.answer : "No answer provided for this question.";
  };

  const handleSaveReview = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await axios.post(`http://localhost:3000/api/forms/entries/${applicantSubmission.id}/review`, {
        notes: notes.trim() || undefined,
        score: score.trim() || undefined
      });

      if (response.status === 200) {
        setSaveMessage('Review saved successfully!');
        console.log("Review saved successfully:", response.data);
        
        // Clear the message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error("Error saving review:", error);
      setSaveMessage('Failed to save review. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {applicationName}
            </h1>
            
            {/* Position Description */}
            {applicationDescription && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-center mb-3">
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {applicationDescription}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Applicant Info & Questions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Applicant Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Applicant Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {applicantSubmission.firstName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {applicantSubmission.lastName}
                  </div>
                </div>
              </div>
              
              {/* Email field - full width */}
              {applicantSubmission.email && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {applicantSubmission.email}
                  </div>
                </div>
              )}
            </div>

            {/* Application Responses */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Application Responses
              </h2>
              
              <div className="space-y-6">{applicationQuestions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    <h3 className="text-base font-medium text-gray-900 leading-relaxed">
                      {question.questionText}
                    </h3>
                  </div>
                  
                  <div className="ml-9">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {findAnswer(question.id)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}</div>
            </div>
          </div>

          {/* Right Column - Review Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Review Panel
              </h2>
              
              {/* Notes Section */}
              <div className="mb-6">
                <label htmlFor="reviewerNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes
                </label>
                <textarea
                  id="reviewerNotes"
                  rows={6}
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add your review notes here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>

              {/* Score Section */}
              <div className="mb-6">
                <label htmlFor="reviewerScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Score (1-10)
                </label>
                <input
                  type="number"
                  id="reviewerScore"
                  value={score}
                  onChange={handleScoreChange}
                  min="1"
                  max="10"
                  step="0.1"
                  placeholder="e.g., 8.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a score between 1 and 10 (decimals allowed)</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleSaveReview} 
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Review'}
                </Button>
                
                {/* Save Message */}
                {saveMessage && (
                  <div className={`text-sm text-center p-2 rounded-md ${
                    saveMessage.includes('successfully') 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {saveMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
