import { getBackendUrl } from '@/lib/constants/string';

export interface ApplicationFormData {
  id: number;
  staff_id: string;
  title: string;
  description: string;
  created_at: string;
}

export const formFeedData: ApplicationFormData[] = [
  {
    id: 1,
    staff_id: "125",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-24T00:02:37.076Z"
  },
  {
    id: 2,
    staff_id: "126",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-24T00:09:10.219Z"
  },
  {
    id: 3,
    staff_id: "0e10aa38-37f5-46f5-961a-6a4542b6852f",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T00:54:04.994Z"
  },
  {
    id: 4,
    staff_id: "0e10aa38-37f5-46f5-961a-6a4542b6852f",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T00:56:15.015Z"
  },
  {
    id: 5,
    staff_id: "a0a69aae-6e4f-4b97-8715-ada834b44cc5",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:32:42.171Z"
  },
  {
    id: 6,
    staff_id: "c6e640f8-1539-43b7-9360-7938fcb52925",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:38:03.740Z"
  },
  {
    id: 7,
    staff_id: "484667d2-35e6-4ad7-be34-3c444be98f11",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:38:08.228Z"
  },
  {
    id: 8,
    staff_id: "1d04e0a0-7f2d-4b2a-8cfc-79c4ff7479e9",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:38:22.721Z"
  },
  {
    id: 9,
    staff_id: "d7f923a8-e6e8-4b59-a792-f2f743f07cfd",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:38:41.160Z"
  },
  {
    id: 10,
    staff_id: "d7f923a8-e6e8-4b59-a792-f2f743f07cfd",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:43:33.001Z"
  },
  {
    id: 11,
    staff_id: "b6a5dc9c-b8f0-4fd4-89a8-ee5c2b6e5673",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:43:53.973Z"
  },
  {
    id: 12,
    staff_id: "7b395770-cb36-4a6f-81b4-1a65c1ae036c",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:44:11.442Z"
  },
  {
    id: 13,
    staff_id: "ec8d0316-d20c-4b5d-a51b-42645e11a7c9",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:45:39.948Z"
  },
  {
    id: 14,
    staff_id: "8f087ff7-0fdd-4da0-a5b6-86b349668a0b",
    title: "Software Engineering Assessment",
    description: "This form is used to evaluate software engineering candidates.",
    created_at: "2025-04-27T01:45:54.827Z"
  }
];

// Helper function to fetch forms from the API
export async function fetchForms(): Promise<ApplicationFormData[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/forms/feed`);
    const data = await response.json();
    return data.feed;
  } catch (error) {
    console.error('Error fetching forms:', error);
    return formFeedData; // Fallback to static data
  }
}
