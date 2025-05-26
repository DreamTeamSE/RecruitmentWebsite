// src/lib/data/applicationData.ts

// Define the structure for an individual application question
export interface ApplicationQuestion {
  id: string;
  questionText: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

// Define the structure of your application data
export interface ApplicationData {
  id: string;
  name: string;
  term: string;
  description: string;
  status?: 'open' | 'closed';
  deadline?: string;
  closedDate?: string;
  questions?: ApplicationQuestion[];
  // applyLink?: string; // Kept for data integrity, though button was removed from display
}

// Your actual application data source
// IMPORTANT: Ensure this data is complete and IDs match your linking structure.
export const applicationsData: ApplicationData[] = [
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    description: "Our General Shadowing program for Fall 2025 offers unparalleled insights into various medical fields. Participants will have the opportunity to observe healthcare professionals in action and gain a deeper understanding of the clinical environment.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      { id: "gs-q1", questionText: "Tell Me About Yourself?", type: "textarea", placeholder: "Share a bit about your background, interests, and what motivates you...", required: true },
      { id: "gs-q2", questionText: "Why Do You Want To Join Dream Team Engineering for this program?", type: "textarea", placeholder: "Explain your interest in DTE and this specific shadowing opportunity...", required: true },
      { id: "gs-q3", questionText: "What do you hope to gain from this experience?", type: "textarea", placeholder: "Describe your expectations and learning goals...", required: false },
    ],
  },
  {
    id: "design-fall-2025",
    name: "Design",
    term: "Fall 2025",
    description: "Join our Design branch for Fall 2025 to work on cutting-edge healthcare solutions, focusing on user experience and innovative product design.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      { id: "design-q1", questionText: "Describe your design experience or portfolio (link if available).", type: "textarea", placeholder: "Include links to Behance, Dribbble, personal site, or attach files later...", required: true },
      { id: "design-q2", questionText: "Why are you passionate about design in the healthcare space?", type: "textarea", placeholder: "Explain your motivation...", required: true },
      { id: "design-q3", questionText: "What design tools are you proficient in?", type: "text", placeholder: "e.g., Figma, Adobe XD, Sketch...", required: true },
    ],
  },
  {
    id: "research-fall-2025",
    name: "Research",
    term: "Fall 2025",
    description: "Contribute to impactful healthcare research in our Fall 2025 program...",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "research-q1", questionText: "What research areas are you most interested in within healthcare technology?", type: "textarea", placeholder: "Be specific about topics or methodologies...", required: true },
        { id: "research-q2", questionText: "Describe any previous research experience you have.", type: "textarea", placeholder: "Include projects, publications, or coursework...", required: false },
    ],
  },
  {
    id: "software-fall-2025",
    name: "Software",
    term: "Fall 2025",
    description: "Develop innovative software solutions for healthcare in our Fall 2025 cohort. You'll work with modern technologies to build applications that directly impact patient care and clinical workflows.",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "software-q1", questionText: "What programming languages are you most proficient in?", type: "text", placeholder: "e.g., Python, JavaScript, Java, C++", required: true },
        { id: "software-q2", questionText: "Describe a software project you're proud of (personal, academic, or professional).", type: "textarea", placeholder: "Include a link to a GitHub repository if available...", required: true },
        { id: "software-q3", questionText: "Why are you interested in applying your software skills to the healthcare domain?", type: "textarea", placeholder: "Explain your motivation and interest in this specific field...", required: true },
    ],
  },
  {
    id: "stem-events-fall-2025",
    name: "Stem Special Events",
    term: "Fall 2025",
    description: "Participate and organize STEM special events with us in Fall 2025. Help us promote innovation and engagement within the STEM community at UF.",
    status: "open",
    deadline: "9/10/25",
    questions: [
        { id: "stem-q1", questionText: "What experience do you have in event planning or coordination?", type: "textarea", placeholder: "Describe any relevant roles or activities...", required: false },
        { id: "stem-q2", questionText: "Why are you interested in contributing to STEM outreach and events?", type: "textarea", placeholder: "Share your motivations...", required: true },
    ],
  },
  {
    id: "gs-fall-2024",
    name: "General Shadowing",
    term: "Fall 2024",
    description: "The General Shadowing program for Fall 2024 has concluded.",
    status: "closed",
    closedDate: "9/10/24",
    questions: [],
  },
  // ... Add ALL your other application data objects here
];
