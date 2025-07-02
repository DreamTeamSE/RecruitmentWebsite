import { useState } from 'react';
import { BACKEND_URL } from '@/lib/constants/string';

interface UseFormDeleteOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useFormDelete = (options: UseFormDeleteOptions = {}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const openDeleteModal = (formId: number, title: string) => {
    setFormToDelete({ id: formId, title });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFormToDelete(null);
  };

  const deleteForm = async (formId: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://${BACKEND_URL}/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete form: ${errorText}`);
      }

      console.log('Form deleted successfully');
      options.onSuccess?.();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete form';
      console.error('Error deleting form:', err);
      options.onError?.(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (formToDelete) {
      const success = await deleteForm(formToDelete.id);
      if (success) {
        closeDeleteModal();
      }
    }
  };

  return {
    isDeleting,
    showDeleteModal,
    formToDelete,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    deleteForm
  };
};
