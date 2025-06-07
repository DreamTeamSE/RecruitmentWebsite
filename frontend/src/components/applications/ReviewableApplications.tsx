"use client";

import React from 'react';
import Link from 'next/link';
import { ApplicationFormData, fetchForms } from '@/lib/data/application/forms';

// Edit icon component
const EditIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ReviewableApplicationCard: React.FC<ApplicationFormData> = ({ id, title, description, created_at }) => {
  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 relative group">
      {/* Edit button - positioned absolutely in top right */}
      <Link 
        href={`/applications-review/${id}/edit`} 
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
        title="Edit application form"
      >
        <EditIcon />
      </Link>

      {/* Main content - wrapped in Link for navigation */}
      <Link href={`/applications-review/${id}`} className="block">
        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2 pr-12">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mb-3">{description}</p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Created: {formattedDate}</span>
          <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
            View Submissions →
          </span>
        </div>
      </Link>
    </div>
  );
};

export default function ReviewableApplications() {
  const [forms, setForms] = React.useState<ApplicationFormData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadForms = async () => {
      try {
        const formsData = await fetchForms();
        setForms(formsData);
        setError(null);
      } catch (error) {
        setError('Failed to load application forms. Please try again later.');
        console.error('Error loading forms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadForms();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading application forms...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Forms</h1>
          <p className="text-gray-600">Review and manage application submissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <ReviewableApplicationCard key={form.id} {...form} />
          ))}
        </div>

        {forms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No application forms found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
