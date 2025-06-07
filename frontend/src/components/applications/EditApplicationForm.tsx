"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApplicationQuestion } from '@/models/types/application';
import { ApplicationFormData, fetchForms } from '@/lib/data/application/forms';
import { BACKEND_URL } from '@/lib/constants/string';

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

const Save = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17,21 17,13 7,13 7,21"/>
    <polyline points="7,3 7,8 15,8"/>
  </svg>
);

const Trash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

interface EditApplicationFormData {
  id: number;
  title: string;
  description: string;
  recruiter_id: string;
  created_at: string;
  questions: ApplicationQuestion[];
}

interface EditApplicationFormProps {
  applicationId: string;
}

const EditApplicationForm: React.FC<EditApplicationFormProps> = ({ applicationId }) => {
  const [formData, setFormData] = useState<EditApplicationFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<ApplicationQuestion>>({
    questionText: '',
    type: 'text',
    placeholder: '',
    required: true
  });

  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Fetch the specific form from the API
        const forms = await fetchForms();
        const form = forms.find(f => f.id.toString() === applicationId);
        
        if (form) {
          // Also fetch existing questions for this form
          const questionsResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/question?form_id=${form.id}`);
          let existingQuestions: ApplicationQuestion[] = [];
          
          if (questionsResponse.ok) {
            const questionsResult = await questionsResponse.json();
            existingQuestions = (questionsResult.question || []).map((q: any) => ({
              id: `question-${q.question_order}`,
              questionText: q.question_text,
              type: q.question_type === 'text' ? 'text' : 'textarea',
              required: true,
              placeholder: `Enter your answer for question ${q.question_order}...`
            }));
          }

          setFormData({
            id: form.id,
            title: form.title,
            description: form.description,
            recruiter_id: form.recruiter_id,
            created_at: form.created_at,
            questions: existingQuestions
          });
        } else {
          setError(`Form not found with ID: ${applicationId}`);
        }
      } catch (err) {
        setError('Failed to load form data');
        console.error('Error loading form data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [applicationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewQuestion(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const addQuestion = () => {
    if (newQuestion.questionText?.trim() && formData) {
      const question: ApplicationQuestion = {
        id: `question-${formData.questions.length + 1}`,
        questionText: newQuestion.questionText,
        type: newQuestion.type || 'text',
        placeholder: newQuestion.placeholder || '',
        required: newQuestion.required ?? true
      };
      
      setFormData(prev => prev ? ({
        ...prev,
        questions: [...prev.questions, question]
      }) : null);

      // Reset new question form
      setNewQuestion({
        questionText: '',
        type: 'text',
        placeholder: '',
        required: true
      });
    }
  };

  const removeQuestion = (questionId: string) => {
    setFormData(prev => prev ? ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }) : null);
  };

  const handleSave = async () => {
    if (!formData) return;
    
    setSaving(true);
    try {
      // Update form basic info
      const updateFormResponse = await fetch(`http://${BACKEND_URL}/api/forms/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
        }),
      });

      if (!updateFormResponse.ok) {
        throw new Error('Failed to update form');
      }

      // For questions, you might need to implement question update/creation endpoints
      // This is a simplified approach - in a real app you'd have proper CRUD operations
      console.log('Form updated successfully', formData);
      alert('Form updated successfully!');
      
    } catch (err) {
      console.error('Error saving form:', err);
      alert('Failed to save form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading form data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-red-600">{error || 'Form not found'}</p>
            <Link 
              href="/applications-review" 
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft />
              Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href={`/applications-review/${applicationId}`} 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft />
            Back to Application Review
          </Link>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-gray-200">
          <header className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">Edit Application Form</h1>
            <p className="text-gray-600">Form ID: {formData.id}</p>
            <p className="text-sm text-gray-500">Created: {new Date(formData.created_at).toLocaleDateString()}</p>
          </header>

          {/* Basic Form Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-lg font-semibold text-gray-800 mb-2">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter form title"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-lg font-semibold text-gray-800 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="Enter form description"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions</h2>
            
            {/* Existing Questions */}
            <div className="space-y-4 mb-6">
              {formData.questions.map((question, index) => (
                <div key={question.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Question {index + 1} ({question.type})
                      </h3>
                      <p className="text-gray-700 mb-2">{question.questionText}</p>
                      {question.placeholder && (
                        <p className="text-sm text-gray-500">Placeholder: {question.placeholder}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Required: {question.required ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Remove question"
                    >
                      <Trash />
                    </button>
                  </div>
                </div>
              ))}
              
              {formData.questions.length === 0 && (
                <p className="text-gray-500 text-center py-8">No questions added yet.</p>
              )}
            </div>

            {/* Add New Question */}
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <textarea
                    id="questionText"
                    name="questionText"
                    value={newQuestion.questionText || ''}
                    onChange={handleQuestionInputChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your question..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={newQuestion.type || 'text'}
                      onChange={handleQuestionInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="text">Text Input</option>
                      <option value="textarea">Long Text (Textarea)</option>
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter placeholder text..."
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                    Required question
                  </label>
                </div>
                
                <button
                  onClick={addQuestion}
                  disabled={!newQuestion.questionText?.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="text-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save />
              {saving ? 'Saving Changes...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditApplicationForm;
