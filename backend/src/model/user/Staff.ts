export default interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

// For backward compatibility and API responses
export interface StaffSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}
