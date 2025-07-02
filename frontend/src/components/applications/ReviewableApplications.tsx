"use client";

import React from 'react';
import Link from 'next/link';
import { ApplicationFormData, fetchForms } from '@/lib/data/application/forms';
import { BACKEND_URL } from '@/lib/constants/string';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

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

// Trash icon component
const TrashIcon = () => (
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
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

interface ReviewableApplicationCardProps extends ApplicationFormData {
  onDelete: (formId: number) => void;
  isDeleting: boolean;
  onShowDeleteModal: (formId: number, title: string) => void;
}

const ReviewableApplicationCard: React.FC<ReviewableApplicationCardProps> = ({ 
  id, 
  title, 
  description, 
  created_at, 
  onDelete, 
  isDeleting,
  onShowDeleteModal
}) => {
  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowDeleteModal(id, title);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 relative group">
      {/* Action buttons - positioned absolutely in top right */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Link 
          href={`/applications-review/${id}/edit`} 
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
          title="Edit application form"
        >
          <EditIcon />
        </Link>
        
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete application form"
        >
          {isDeleting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
          ) : (
            <TrashIcon />
          )}
        </button>
      </div>

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
  const [deletingFormId, setDeletingFormId] = React.useState<number | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    formId: number | null;
    formTitle: string;
  }>({
    isOpen: false,
    formId: null,
    formTitle: ''
  });

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

  const showDeleteModal = (formId: number, title: string) => {
    setDeleteModal({
      isOpen: true,
      formId,
      formTitle: title
    });
  };

  const hideDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      formId: null,
      formTitle: ''
    });
  };

  const handleDeleteForm = async (formId: number) => {
    setDeletingFormId(formId);
    try {
      const response = await fetch(`http://${BACKEND_URL}/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete form: ${errorText}`);
      }

      // Remove the form from the local state
      setForms(prevForms => prevForms.filter(form => form.id !== formId));
      
      console.log('Form deleted successfully');
    } catch (err) {
      console.error('Error deleting form:', err);
      alert('Failed to delete form. Please try again.');
    } finally {
      setDeletingFormId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.formId) {
      await handleDeleteForm(deleteModal.formId);
      hideDeleteModal();
    }
  };

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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Forms</h1>
            <p className="text-gray-600">Review and manage application submissions</p>
          </div>
          <Link 
            href="/applications-review/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
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
              className="mr-2"
            >
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create New Form
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <ReviewableApplicationCard 
              key={form.id} 
              {...form} 
              onDelete={handleDeleteForm}
              isDeleting={deletingFormId === form.id}
              onShowDeleteModal={showDeleteModal}
            />
          ))}
        </div>

        {forms.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No application forms found</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first application form.</p>
              <Link 
                href="/applications-review/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
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
                  className="mr-2"
                >
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Create Your First Form
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={hideDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Application Form"
        message={`Are you sure you want to delete "${deleteModal.formTitle}"? This action cannot be undone and will remove all associated questions and submissions.`}
        confirmText="Delete Form"
        cancelText="Cancel"
        type="danger"
        isLoading={deletingFormId === deleteModal.formId}
      />
    </div>
  );
}
