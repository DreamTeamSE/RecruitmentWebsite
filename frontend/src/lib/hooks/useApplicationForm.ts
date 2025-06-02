import { useState } from 'react';
import { FormDataState } from '@/models/types/application';
import { ApplicationDetailProps } from '@/models/types/application';

export function useApplicationForm(application: ApplicationDetailProps['application']) {
  const [formData, setFormData] = useState<FormDataState>(() => {
    const initialData: FormDataState = {
      firstName: '',
      lastName: '',
      email: '',
    };
    application.questions?.forEach(q => {
      initialData[q.id] = '';
    });
    return initialData;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Application Submitted for:", application.name, "| Data:", formData);
    alert(`Application for "${application.name}" submitted! (Check console for data)`);
  };

  return {
    formData,
    handleInputChange,
    handleSubmit,
  };
}
