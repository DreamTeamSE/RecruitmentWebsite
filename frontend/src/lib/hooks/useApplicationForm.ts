import { useState } from 'react';
import { FormDataState } from '@/models/types/application';
import { ApplicationDetailProps } from '@/models/types/application';
import { logger } from '@/lib/services/logger.service';
import { toast } from '@/lib/services/toast.service';

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
    logger.userAction('Application submitted', {
      applicationName: application.name,
      formData
    });
    toast.success(`Application for "${application.name}" submitted successfully!`);
  };

  return {
    formData,
    handleInputChange,
    handleSubmit,
  };
}
