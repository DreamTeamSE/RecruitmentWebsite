"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ApplicationQuestion } from '@/models/types/application';

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

interface CreateApplicationFormData {
  name: string;
  term: string;
  description: string;
  deadline: string;
  status: 'open' | 'closed';
  questions: ApplicationQuestion[];
}

const CreateApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateApplicationFormData>({
    name: '',
    term: '',
    description: '',
    deadline: '',
    status: 'open',
    questions: []
  });

  const [newQuestion, setNewQuestion] = useState<Partial<ApplicationQuestion>>({
    questionText: '',
    type: 'text',
    placeholder: '',
    required: true
  });

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
        id: `q${formData.questions.length + 1}`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate a unique ID for the application
    const applicationId = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${formData.term.toLowerCase().replace(/\s+/g, '-')}`;
    
    const newApplication = {
      ...formData,
      id: applicationId
    };

    // In a real application, you would send this to your backend
    console.log('New Application Created:', newApplication);
    alert('Application created successfully! (Check console for data)');
    
    // Reset form
    setFormData({
      name: '',
      term: '',
      description: '',
      deadline: '',
      status: 'open',
      questions: []
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/applications-review" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft />
            Back to Applications Review
          </Link>
        </div>
        
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-gray-200">
          <header className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Create New Application</h1>
            <p className="text-xl text-gray-600 mt-2">Set up a new application for prospective candidates</p>
          </header>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-lg font-semibold text-gray-800 mb-2">
                    Application Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Software, Design, Research"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="term" className="block text-lg font-semibold text-gray-800 mb-2">
                    Term *
                  </label>
                  <input
                    type="text"
                    id="term"
                    name="term"
                    value={formData.term}
                    onChange={handleInputChange}
                    placeholder="e.g., Fall 2025, Spring 2026"
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
                  placeholder="Describe what this application is for and what applicants can expect..."
                  required
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="deadline" className="block text-lg font-semibold text-gray-800 mb-2">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-lg font-semibold text-gray-800 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Application Questions</h2>
              
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
                                  Placeholder: "{question.placeholder}"
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
                className="bg-green-600 text-white font-bold py-3 px-10 rounded-lg hover:bg-green-700 transition-transform duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Create Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateApplicationForm;
