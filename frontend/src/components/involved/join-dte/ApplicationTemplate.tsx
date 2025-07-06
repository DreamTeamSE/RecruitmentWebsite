// components/involved/join-dte/ApplicationDetailPage.tsx
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { filledApplicationData } from '@/lib/data/application/application';
import { ApplicationQuestion } from '@/models/types/application';
import { BACKEND_URL } from '@/lib/constants/string';
import { ApplicationFormData, fetchForms } from '@/lib/data/application/forms';

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

// Form Question Component
interface FormQuestionProps {
  question: ApplicationQuestion;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const FormQuestion: React.FC<FormQuestionProps> = ({ question, value, onChange }) => {
  return (
    <div className="mb-6">
      <label htmlFor={question.id} className="block text-lg font-semibold text-gray-800 mb-2">
        {question.questionText}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.type === 'textarea' ? (
        <textarea
          id={question.id}
          name={question.id}
          value={value}
          onChange={onChange}
          placeholder={question.placeholder}
          required={question.required}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
        />
      ) : (
        <input
          type="text"
          id={question.id}
          name={question.id}
          value={value}
          onChange={onChange}
          placeholder={question.placeholder}
          required={question.required}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )}
    </div>
  );
};

// Main Template Component
interface ApplicationTemplateProps {
  applicationId: string; // This is now the form ID from the API
}

const ApplicationTemplate: React.FC<ApplicationTemplateProps> = ({ applicationId }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<{ firstName: string; lastName: string; email: string; [key: string]: string }>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentForm, setCurrentForm] = useState<ApplicationFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiQuestions, setApiQuestions] = useState<ApplicationQuestion[]>([]);
  const [hasSubmittedLocally, setHasSubmittedLocally] = useState(false);

  // Load form data and find the specific form
  React.useEffect(() => {
    const loadFormData = async () => {
      try {
        const forms = await fetchForms();
        const form = forms.find(f => f.id.toString() === applicationId);
        setCurrentForm(form || null);
        
        // If we found a form, also fetch its questions
        if (form) {
          const questionsResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/question?form_id=${form.id}`);
          if (questionsResponse.ok) {
            const questionsResult = await questionsResponse.json();
            const fetchedQuestions = (questionsResult.question || []).map((q: any) => ({
              id: q.id.toString(), // Use actual database ID
              questionText: q.question_text,
              type: q.question_type === 'text' ? 'text' : 'textarea',
              required: true,
              placeholder: `Enter your answer for question ${q.question_order}...`,
              order: q.question_order,
              dbId: q.id // Store database ID
            }));
            setApiQuestions(fetchedQuestions);
          }
        }
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [applicationId]);

  // For backward compatibility, try to find application data
  const application = useMemo(() => 
    filledApplicationData.find(app => app.id === applicationId), 
    [applicationId]
  );

  // Initialize form state for questions
  React.useEffect(() => {
    if (application && application.questions) {
      const questionState: { [key: string]: string } = {};
      application.questions.forEach((q) => {
        questionState[q.id] = '';
      });
      setFormData(prev => ({ ...prev, ...questionState }));
    } else if (apiQuestions.length > 0) {
      // Initialize form data with API questions
      const questionState: { [key: string]: string } = {};
      apiQuestions.forEach((q) => {
        questionState[q.id] = '';
      });
      setFormData(prev => ({ ...prev, ...questionState }));
    } else if (currentForm) {
      // Default questions for forms without predefined questions
      const defaultQuestions = {
        'question-1': '',
        'question-2': '',
        'question-3': ''
      };
      setFormData(prev => ({ ...prev, ...defaultQuestions }));
    }
  }, [application, currentForm, apiQuestions]);

  // Default questions when no application data is available
  const defaultQuestions: ApplicationQuestion[] = [
    {
      id: 'question-1',
      questionText: 'Why are you interested in this position?',
      type: 'textarea',
      required: true,
      placeholder: 'Tell us about your interest and motivation...'
    },
    {
      id: 'question-2',
      questionText: 'What relevant experience do you have?',
      type: 'textarea',
      required: true,
      placeholder: 'Describe your relevant experience, skills, and projects...'
    },
    {
      id: 'question-3',
      questionText: 'What do you hope to achieve in this role?',
      type: 'textarea',
      required: true,
      placeholder: 'Share your goals and what you hope to accomplish...'
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Optional: Function to clear local submission flag (useful for testing)
  const clearLocalSubmission = () => {
    setHasSubmittedLocally(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user has already submitted locally
    if (hasSubmittedLocally) {
      alert('You have already submitted an application for this form. Please navigate away and return to submit another application.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Validation
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        alert('Please fill in all required fields: First Name, Last Name, and Email Address.');
        setIsSubmitting(false);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert('Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create the applicant
      const applicantResponse = await fetch(`http://${BACKEND_URL}/api/applicant/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
        }),
      });

      if (!applicantResponse.ok) {
        throw new Error('Failed to create applicant');
      }

      const applicantResult = await applicantResponse.json();
      console.log("Applicant created:", applicantResult);
      
      const applicant_id = applicantResult.inserted_applicant.id;
      const form_id = parseInt(applicationId); // Use the form ID directly from the URL
      
      if (!form_id || isNaN(form_id)) {
        throw new Error(`Invalid form ID: ${applicationId}`);
      }

      // Step 2: Create form entry
      const formEntryResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicant_id: applicant_id,
          form_id: form_id,
          applicant_email: formData.email, // Email is now required
        }),
      });

      if (!formEntryResponse.ok) {
        const errorData = await formEntryResponse.json();
        throw new Error(errorData.message || 'Failed to create form entry');
      }

      const formEntryResult = await formEntryResponse.json();
      console.log("Form entry created:", formEntryResult);
      
      const form_entry_id = formEntryResult.formEntry.id;

      // Step 3: Get existing questions for this form or create them
      const questionsResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/question?form_id=${form_id}`);
      let existingQuestions: any[] = [];
      
      if (questionsResponse.ok) {
        const questionsResult = await questionsResponse.json();
        existingQuestions = questionsResult.question || [];
        console.log("Existing questions:", existingQuestions);
      }

      // Step 4: Submit answers for each question
      const questionsToProcess = apiQuestions.length > 0 ? apiQuestions : (application?.questions || defaultQuestions);
      
      if (questionsToProcess) {
        for (let i = 0; i < questionsToProcess.length; i++) {
          const question = questionsToProcess[i];
          const answer_text = formData[question.id];
          
          if (!answer_text || answer_text.trim() === '') {
            console.warn(`No answer provided for question: ${question.id}`);
            continue;
          }

          // Find existing question by order or create new one
          let questionRecord = existingQuestions.find(q => q.question_order === i + 1);
          
          if (!questionRecord) {
            // Create the question if it doesn't exist
            try {
              const createQuestionResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/question`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  form_id: form_id,
                  question_text: question.questionText,
                  question_type: "text",
                  question_order: i + 1,
                }),
              });

              if (createQuestionResponse.ok) {
                const questionResult = await createQuestionResponse.json();
                questionRecord = questionResult.question;
                console.log(`Created question ${question.id}:`, questionResult);
              } else {
                console.error(`Failed to create question ${question.id}`);
                continue;
              }
            } catch (error) {
              console.error(`Error creating question ${question.id}:`, error);
              continue;
            }
          }

          // Submit the answer using the question's database ID
          const answerResponse = await fetch(`http://${BACKEND_URL}/api/forms/entry/answer/text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              answer_type: "text",
              applicant_id: applicant_id,
              form_entry_id: form_entry_id,
              question_id: questionRecord.id,
              answer_text: answer_text,
            }),
          });

          if (!answerResponse.ok) {
            throw new Error(`Failed to submit answer for question: ${question.id}`);
          }

          const answerResult = await answerResponse.json();
          console.log(`Answer submitted for ${question.id}:`, answerResult);
        }
      }

      alert(`Application submitted successfully! Applicant ID: ${applicant_id}, Form Entry ID: ${form_entry_id}`);
      console.log("Form Data:", formData);
      console.log("Created Applicant:", applicantResult.inserted_applicant);
      console.log("Created Form Entry:", formEntryResult.formEntry);
      
      // Mark as submitted for this page visit only (no persistence)
      setHasSubmittedLocally(true);
      
    } catch (error) {
      console.error("Error submitting application:", error);
      alert(`Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p>Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!currentForm && !application) {
    return <div className="text-center py-20">Application form not found.</div>;
  }

  // Use form data if available, otherwise fall back to application data
  const displayData = currentForm ? {
    name: currentForm.title,
    description: currentForm.description,
    deadline: 'See form details',
    term: ''
  } : {
    name: application?.name || 'Application Form',
    description: application?.description || 'Please fill out this application form.',
    deadline: application?.deadline || 'See form details',
    term: application?.term || ''
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/get-involved/join-dte" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft />
            Back to Applications
          </Link>
        </div>
        
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-gray-200">
          <header className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
              {currentForm ? currentForm.title : displayData.name}
            </h1>
            {displayData.term && (
              <p className="text-xl text-gray-600 mt-2">{displayData.term}</p>
            )}
            {displayData.deadline && (
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-r-lg">
                <p><span className="font-bold">Application Deadline:</span> {displayData.deadline}</p>
              </div>
            )}
          </header>
          
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-lg font-semibold text-gray-800 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-lg font-semibold text-gray-800 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="email" className="block text-lg font-semibold text-gray-800 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Application Questions Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Questions</h2>
              {(apiQuestions.length > 0 ? apiQuestions : (application?.questions || defaultQuestions)).map(q => (
                <FormQuestion
                  key={q.id}
                  question={q}
                  value={formData[q.id] || ''}
                  onChange={handleChange}
                />
              ))}
            </div>
            <div className="mt-8 text-center">
              <button 
                type="submit" 
                disabled={isSubmitting || hasSubmittedLocally}
                className="bg-blue-600 text-white font-bold py-3 px-10 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-transform duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isSubmitting ? 'Submitting...' : hasSubmittedLocally ? 'Application Already Submitted' : 'Submit Application'}
              </button>
              {hasSubmittedLocally && (
                <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg">
                  <p className="text-sm">
                    ✅ You have already submitted an application for this form. 
                    Thank you for your submission! Navigate back to the applications page and return here to submit again if needed.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTemplate;
