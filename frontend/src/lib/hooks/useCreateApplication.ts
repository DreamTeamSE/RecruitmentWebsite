import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ApplicationQuestion } from '@/models/types/application';
import { apiService } from '@/lib/services/api.service';

interface CreateApplicationFormData {
  title: string;
  description: string;
  staff_id: string;
  questions: ApplicationQuestion[];
}

interface UseCreateApplicationReturn {
  formData: CreateApplicationFormData;
  newQuestion: Partial<ApplicationQuestion>;
  isSubmitting: boolean;
  updateFormData: (field: string, value: string) => void;
  updateNewQuestion: (field: string, value: string | boolean) => void;
  addQuestion: () => void;
  removeQuestion: (index: number) => void;
  moveQuestion: (index: number, direction: 'up' | 'down') => void;
  submitForm: () => Promise<string | null>;
  validateForm: () => { isValid: boolean; errors: string[] };
}

export const useCreateApplication = (): UseCreateApplicationReturn => {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreateApplicationFormData>({
    title: '',
    description: '',
    staff_id: (session?.user as { id: string })?.id || '',
    questions: []
  });

  const [newQuestion, setNewQuestion] = useState<Partial<ApplicationQuestion>>({
    questionText: '',
    type: 'text',
    placeholder: '',
    required: true
  });

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateNewQuestion = useCallback((field: string, value: string | boolean) => {
    setNewQuestion(prev => ({ ...prev, [field]: value }));
  }, []);

  const addQuestion = useCallback(() => {
    if (!newQuestion.questionText?.trim()) return;

    const question: ApplicationQuestion = {
      id: `temp-${Date.now()}`,
      questionText: newQuestion.questionText,
      type: newQuestion.type || 'text',
      placeholder: newQuestion.placeholder || '',
      required: newQuestion.required ?? true
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, question]
    }));

    setNewQuestion({
      questionText: '',
      type: 'text',
      placeholder: '',
      required: true
    });
  }, [newQuestion]);

  const removeQuestion = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  }, []);

  const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    const newQuestions = [...formData.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setFormData(prev => ({ ...prev, questions: newQuestions }));
    }
  }, [formData.questions]);

  const validateForm = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!formData.title.trim()) errors.push('Form Title');
    if (!formData.description.trim()) errors.push('Description');
    if (!formData.staff_id.trim()) errors.push('Staff Selection');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData]);

  const submitForm = useCallback(async (): Promise<string | null> => {
    const validation = validateForm();
    if (!validation.isValid) {
      throw new Error(`Please fill in the following required fields:\\n• ${validation.errors.join('\\n• ')}`);
    }

    setIsSubmitting(true);
    
    try {
      const createFormResponse = await apiService.post<{ insertedForm: { id: string } }>('/api/forms/application', {
        staff_id: formData.staff_id,
        title: formData.title,
        description: formData.description,
      });

      const newFormId = createFormResponse.insertedForm.id;

      if (formData.questions.length > 0) {
        for (let i = 0; i < formData.questions.length; i++) {
          const question = formData.questions[i];
          
          await apiService.post('/api/forms/entry/question', {
            form_id: newFormId,
            question_text: question.questionText,
            question_type: question.type,
            question_order: i + 1
          });
        }
      }

      return newFormId;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  return {
    formData,
    newQuestion,
    isSubmitting,
    updateFormData,
    updateNewQuestion,
    addQuestion,
    removeQuestion,
    moveQuestion,
    submitForm,
    validateForm
  };
};