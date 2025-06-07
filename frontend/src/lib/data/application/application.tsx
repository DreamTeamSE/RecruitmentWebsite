// src/lib/data/applicationData.ts
import { Application, ApplicationData } from "@/models/types/application";




export const applicationsData: Application[] = [
  // Open Applications
  { id: "gs-fall-2025", name: "General Shadowing", term: "Fall 2025", deadline: "9/10/25", status: "open" },
  { id: "design-fall-2025", name: "Design", term: "Fall 2025", deadline: "9/10/25", status: "open" },
  { id: "research-fall-2025", name: "Research", term: "Fall 2025", deadline: "9/10/25", status: "open" },
  { id: "software-fall-2025", name: "Software", term: "Fall 2025", deadline: "9/10/25", status: "open" },
  { id: "stem-events-fall-2025", name: "Stem Special Events", term: "Fall 2025", deadline: "9/10/25", status: "open" },
  // Closed Applications
  { id: "gs-fall-2024", name: "General Shadowing", term: "Fall 2024", closedDate: "9/10/24", status: "closed" },
  { id: "design-fall-2024", name: "Design", term: "Fall 2024", closedDate: "9/10/24", status: "closed" },
  { id: "research-fall-2024", name: "Research", term: "Fall 2024", closedDate: "9/10/24", status: "closed" },
  { id: "software-fall-2024", name: "Software", term: "Fall 2024", closedDate: "9/10/24", status: "closed" },
];

export const filledApplicationData: ApplicationData[] = [
  {
    id: "software-fall-2025",
    name: "Software",
    term: "Fall 2025",
    description: "Develop innovative software solutions for healthcare in our Fall 2025 cohort. You'll work with modern technologies to build applications that directly impact patient care and clinical workflows.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "software-q1",
        questionText: "What programming languages are you most proficient in?",
        type: "text",
        placeholder: "e.g., Python, JavaScript, Java, C++",
        required: true,
      },
      {
        id: "software-q2",
        questionText: "Describe a software project you're proud of (personal, academic, or professional).",
        type: "textarea",
        placeholder: "Include a link to a GitHub repository if available...",
        required: true,
      },
      {
        id: "software-q3",
        questionText: "Why are you interested in applying your software skills to the healthcare domain?",
        type: "textarea",
        placeholder: "Explain your motivation and interest in this specific field...",
        required: true,
      },
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
      {
        id: "design-q1",
        questionText: "Describe your design experience or portfolio (link if available).",
        type: "textarea",
        placeholder: "Include links to Behance, Dribbble, personal site, or attach files later...",
        required: true,
      },
      {
        id: "design-q2",
        questionText: "Why are you passionate about design in the healthcare space?",
        type: "textarea",
        placeholder: "Explain your motivation...",
        required: true,
      },
      {
        id: "design-q3",
        questionText: "What design tools are you proficient in?",
        type: "text",
        placeholder: "e.g., Figma, Adobe XD, Sketch...",
        required: true,
      },
    ],
  },
  {
    id: "research-fall-2025",
    name: "Research",
    term: "Fall 2025",
    description: "Join our Research branch for Fall 2025 to contribute to groundbreaking healthcare research projects, working with data analysis, clinical studies, and innovative research methodologies.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "research-q1",
        questionText: "What research experience do you have (academic, professional, or personal projects)?",
        type: "textarea",
        placeholder: "Describe any research projects, papers, or analytical work you've done...",
        required: true,
      },
      {
        id: "research-q2",
        questionText: "Why are you interested in healthcare research?",
        type: "textarea",
        placeholder: "Explain your motivation for pursuing research in the healthcare domain...",
        required: true,
      },
      {
        id: "research-q3",
        questionText: "What research tools or methodologies are you familiar with?",
        type: "text",
        placeholder: "e.g., R, Python, SPSS, literature reviews, statistical analysis...",
        required: true,
      },
    ],
  },
  {
    id: "stem-events-fall-2025",
    name: "STEM Special Events",
    term: "Fall 2025",
    description: "Join our STEM Special Events team for Fall 2025 to help organize and execute educational outreach programs, workshops, and events that promote STEM education in healthcare.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "stem-q1",
        questionText: "What experience do you have with event planning or educational outreach?",
        type: "textarea",
        placeholder: "Describe any events you've organized, volunteering experience, or educational programs you've been involved with...",
        required: true,
      },
      {
        id: "stem-q2",
        questionText: "Why are you passionate about STEM education and outreach?",
        type: "textarea",
        placeholder: "Explain your motivation for promoting STEM education...",
        required: true,
      },
      {
        id: "stem-q3",
        questionText: "What skills or talents would you bring to our events team?",
        type: "text",
        placeholder: "e.g., public speaking, marketing, social media, graphic design, logistics...",
        required: true,
      },
    ],
  },
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    description: "Our General Shadowing program for Fall 2025 offers unparalleled insights into various medical fields. Participants will have the opportunity to observe healthcare professionals in action and gain a deeper understanding of the clinical environment.",
    status: "open",
    deadline: "9/10/25",
    questions: [
      {
        id: "gs-q1",
        questionText: "Tell Me About Yourself?",
        type: "textarea",
        placeholder: "Share a bit about your background, interests, and what motivates you...",
        required: true,
      },
      {
        id: "gs-q2",
        questionText: "Why Do You Want To Join Dream Team Engineering for this program?",
        type: "textarea",
        placeholder: "Explain your interest in DTE and this specific shadowing opportunity...",
        required: true,
      },
      {
        id: "gs-q3",
        questionText: "What do you hope to gain from this experience?",
        type: "textarea",
        placeholder: "Describe your expectations and learning goals...",
        required: false,
      },
    ],
  },
];
 