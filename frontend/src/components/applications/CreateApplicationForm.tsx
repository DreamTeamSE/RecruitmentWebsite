"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApplicationQuestion } from '@/models/types/application';
import { getBackendUrl } from '@/lib/constants/string';
import { useSession } from "next-auth/react";

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

interface CreateApplicationFormData {
  title: string;
  description: string;
  staff_id: string;
  questions: ApplicationQuestion[];
}

const CreateApplicationForm: React.FC = () => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<CreateApplicationFormData>({
    title: '',
    description: '',
    staff_id: '',
    questions: []
  });

  const [newQuestion, setNewQuestion] = useState<Partial<ApplicationQuestion>>({
    questionText: '',
    type: 'text',
    placeholder: '',
    required: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-assign staff_id to the logged-in user's id
  useEffect(() => {
    if (session?.user && 'id' in session.user) {
      setFormData(prev => ({ ...prev, staff_id: (session.user as { id: string }).id }));
    }
  }, [session?.user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewQuestion(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const addQuestion = () => {
    if (newQuestion.questionText?.trim()) {
      const question: ApplicationQuestion = {
        id: `temp-${Date.now()}`, // Temporary ID for frontend use
        questionText: newQuestion.questionText,
        type: newQuestion.type || 'text',
        placeholder: newQuestion.placeholder || '',
        required: newQuestion.required ?? true
      };
      
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, question]
      }));

      // Reset new question form
      setNewQuestion({
        questionText: '',
        type: 'text',
        placeholder: '',
        required: true
      });
    }
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...formData.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setFormData(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // More detailed validation
    const missingFields: string[] = [];
    if (!formData.title.trim()) missingFields.push('Form Title');
    if (!formData.description.trim()) missingFields.push('Description');
    if (!formData.staff_id.trim()) missingFields.push('Staff Selection');
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the form first
      const createFormResponse = await fetch(`${getBackendUrl()}/api/forms/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: formData.staff_id,
          title: formData.title,
          description: formData.description,
        }),
      });

      if (!createFormResponse.ok) {
        const errorText = await createFormResponse.text();
        throw new Error(`Failed to create form: ${errorText}`);
      }

      const createFormResult = await createFormResponse.json();
      const newFormId = createFormResult.insertedForm.id;
      
      console.log('Form created successfully:', createFormResult);

      // Create questions for the form
      if (formData.questions.length > 0) {
        console.log(`Creating ${formData.questions.length} questions...`);
        
        for (let i = 0; i < formData.questions.length; i++) {
          const question = formData.questions[i];
          
          const createQuestionResponse = await fetch(`${getBackendUrl()}/api/forms/entry/question`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              form_id: newFormId,
              question_text: question.questionText,
              question_type: question.type,
              question_order: i + 1
            }),
          });

          if (!createQuestionResponse.ok) {
            console.error(`Failed to create question ${i + 1}:`, await createQuestionResponse.text());
            // Continue with other questions rather than failing completely
          } else {
            console.log(`Question ${i + 1} created successfully`);
          }
        }
      }

      console.log('Form created successfully with ID:', newFormId);
      
      // Show success message and redirect
      alert(`Form "${formData.title}" created successfully!`);
      
      // Redirect to the form review page
      window.location.href = `/applications-review/${newFormId}`;
      
    } catch (error) {
      console.error('Error creating form:', error);
      alert(`Failed to create form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/applications-review" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft />
            Back to Forms Review
          </Link>
        </div>
        
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-gray-200">
          <header className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Create New Form</h1>
            <p className="text-xl text-gray-600 mt-2">Set up a new form for prospective candidates</p>
          </header>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div>
                  <label htmlFor="title" className="block text-lg font-semibold text-gray-800 mb-2">
                    Form Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Engineering Form, Design Team Form"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-lg font-semibold text-gray-800 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this form is for and what applicants can expect..."
                  required
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Form Questions</h2>
              
              {/* Existing Questions */}
              {formData.questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Current Questions:</h3>
                  {formData.questions.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                              Q{index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{question.questionText}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Type: {question.type === 'textarea' ? 'Long answer' : 'Short answer'}
                                {question.required && ' • Required'}
                              </p>
                              {question.placeholder && (
                                <p className="text-sm text-gray-500 italic mt-1">
                                  Placeholder: &quot;{question.placeholder}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === formData.questions.length - 1}
                            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Question */}
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Question</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      id="questionText"
                      name="questionText"
                      value={newQuestion.questionText || ''}
                      onChange={handleQuestionInputChange}
                      placeholder="Enter your question here..."
                      rows={2}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        Answer Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={newQuestion.type || 'text'}
                        onChange={handleQuestionInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="text">Short Answer</option>
                        <option value="textarea">Long Answer</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="placeholder" className="block text-sm font-medium text-gray-700 mb-1">
                        Placeholder Text
                      </label>
                      <input
                        type="text"
                        id="placeholder"
                        name="placeholder"
                        value={newQuestion.placeholder || ''}
                        onChange={handleQuestionInputChange}
                        placeholder="Hint text for applicants..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      name="required"
                      checked={newQuestion.required ?? true}
                      onChange={handleQuestionInputChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="required" className="ml-2 block text-sm text-gray-700">
                      Required question
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-6 border-t border-gray-200">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-600 text-white font-bold py-3 px-10 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {isSubmitting ? 'Creating Form...' : 'Create Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateApplicationForm;
