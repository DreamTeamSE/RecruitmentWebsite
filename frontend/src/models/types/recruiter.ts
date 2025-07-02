export interface Recruiter {
  id: string;
  first_name: string;
  last_name: string;
}

export interface RecruiterResponse {
  recruiters: Recruiter[];
}
