import axios from 'axios';
import { ApplicationQuestion, ApplicationTypeForReview, IndividualReviewPageDisplayData } from '@/models/types/application';

// Define questions for each application type based on the filledApplicationData
const softwareApplicationQuestions: ApplicationQuestion[] = [
  { 
    id: "software-q1", 
    questionText: "What programming languages are you most proficient in?", 
    type: "text" 
  },
  { 
    id: "software-q2", 
    questionText: "Describe a software project you're proud of (personal, academic, or professional).", 
    type: "textarea" 
  },
  { 
    id: "software-q3", 
    questionText: "Why are you interested in applying your software skills to the healthcare domain?", 
    type: "textarea" 
  },
];

const designApplicationQuestions: ApplicationQuestion[] = [
  { 
    id: "design-q1", 
    questionText: "Describe your design experience or portfolio (link if available).", 
    type: "textarea" 
  },
  { 
    id: "design-q2", 
    questionText: "Why are you passionate about design in the healthcare space?", 
    type: "textarea" 
  },
  { 
    id: "design-q3", 
    questionText: "What design tools are you proficient in?", 
    type: "text" 
  },
];

const researchApplicationQuestions: ApplicationQuestion[] = [
  { 
    id: "research-q1", 
    questionText: "What research experience do you have (academic, professional, or personal projects)?", 
    type: "textarea" 
  },
  { 
    id: "research-q2", 
    questionText: "Why are you interested in healthcare research?", 
    type: "textarea" 
  },
  { 
    id: "research-q3", 
    questionText: "What research tools or methodologies are you familiar with?", 
    type: "text" 
  },
];

const stemEventsApplicationQuestions: ApplicationQuestion[] = [
  { 
    id: "stem-q1", 
    questionText: "What experience do you have with event planning or educational outreach?", 
    type: "textarea" 
  },
  { 
    id: "stem-q2", 
    questionText: "Why are you passionate about STEM education and outreach?", 
    type: "textarea" 
  },
  { 
    id: "stem-q3", 
    questionText: "What skills or talents would you bring to our events team?", 
    type: "text" 
  },
];

const generalShadowingApplicationQuestions: ApplicationQuestion[] = [
  { 
    id: "gs-q1", 
    questionText: "Tell Me About Yourself?", 
    type: "textarea" 
  },
  { 
    id: "gs-q2", 
    questionText: "Why Do You Want To Join Dream Team Engineering for this program?", 
    type: "textarea" 
  },
  { 
    id: "gs-q3", 
    questionText: "What do you hope to gain from this experience?", 
    type: "textarea" 
  },
];

// This array holds all application types available for review, each with their submissions.
export const allApplicationTypesForReview: ApplicationTypeForReview[] = [
  {
    id: "software-fall-2025",
    name: "Software",
    term: "Fall 2025",
    questions: softwareApplicationQuestions,
    submissions: [
      {
        id: "max-martin-sw",
        firstName: "Max",
        lastName: "Martin",
        email: "max.martin@example.com",
        appliedDate: "08/15/2024",
        answers: [
          { 
            questionId: "software-q1", 
            answer: "I'm most proficient in Python, JavaScript, and Java. I've been using Python for about 3 years, particularly for data analysis and web development with Django. JavaScript is my go-to for frontend development, and I've built several React applications. Java was my first programming language, which I learned in my computer science courses." 
          },
          { 
            questionId: "software-q2", 
            answer: "I'm most proud of a healthcare data visualization tool I built as part of a hackathon. The project involved creating a web application that could parse and visualize patient data trends over time. I used React for the frontend, Node.js for the backend, and D3.js for interactive charts. The project won second place and was recognized for its potential impact on patient care. You can find it on my GitHub: github.com/maxmartin/health-viz" 
          },
          { 
            questionId: "software-q3", 
            answer: "Healthcare technology has the potential to save lives and improve quality of life for millions of people. I'm particularly interested in how software can make healthcare more accessible and efficient. My grandmother struggled with managing her medications, and I saw firsthand how technology could help solve real problems that affect people's daily lives. I want to combine my technical skills with domain expertise in healthcare to build solutions that truly matter." 
          },
        ],
        currentNotes: "Strong technical background with relevant healthcare interest. Good project experience and clear motivation.",
        currentScore: "8.5",
      },
      {
        id: "sarah-chen-sw",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@example.com",
        appliedDate: "08/12/2024",
        answers: [
          { 
            questionId: "software-q1", 
            answer: "I'm proficient in C++, Python, and Go. I've been coding for 5 years and have experience with full-stack development, focusing primarily on backend systems and API design." 
          },
          { 
            questionId: "software-q2", 
            answer: "My proudest project is a distributed system I built for processing medical imaging data. It uses microservices architecture and can handle large volumes of DICOM files efficiently. The system reduced processing time by 60% compared to the previous solution." 
          },
          { 
            questionId: "software-q3", 
            answer: "I believe technology can democratize healthcare access. Coming from a family of healthcare workers, I've seen the challenges they face with outdated systems. I want to help modernize healthcare infrastructure to improve both patient outcomes and provider experiences." 
          },
        ],
        currentNotes: "Excellent technical skills, strong healthcare motivation. Experience with medical data systems is a plus.",
        currentScore: "9.2",
      },
    ],
  },
  {
    id: "design-fall-2025",
    name: "Design",
    term: "Fall 2025",
    questions: designApplicationQuestions,
    submissions: [
      {
        id: "alice-wonder-ds",
        firstName: "Alice",
        lastName: "Wonderland",
        email: "alice.w@example.com",
        appliedDate: "08/14/2024",
        answers: [
          { 
            questionId: "design-q1", 
            answer: "I have 4 years of UX/UI design experience, including internships at two healthcare startups. My portfolio showcases mobile app designs for patient engagement, a redesign of an electronic health records interface, and various web applications. You can view my work at: dribbble.com/alicewonder and my case studies at: alicewonder.design" 
          },
          { 
            questionId: "design-q2", 
            answer: "Healthcare design is unique because it directly impacts people's wellbeing and life-or-death decisions. I'm passionate about creating intuitive interfaces that reduce cognitive load for healthcare providers and make health information accessible to patients of all backgrounds. Good design in healthcare isn't just about aesthetics—it's about creating clarity in complex, high-stakes environments." 
          },
          { 
            questionId: "design-q3", 
            answer: "I'm proficient in Figma, Adobe Creative Suite (especially XD and Illustrator), Sketch, and Principle for prototyping. I also have experience with user research tools like Maze and Optimal Workshop, and I'm comfortable with basic HTML/CSS for design implementation." 
          },
        ],
        currentNotes: "Excellent portfolio with relevant healthcare design experience. Shows deep understanding of healthcare UX challenges.",
        currentScore: "9.0",
      },
      {
        id: "james-lee-ds",
        firstName: "James",
        lastName: "Lee",
        email: "james.lee@example.com",
        appliedDate: "08/16/2024",
        answers: [
          { 
            questionId: "design-q1", 
            answer: "I'm a graphic design student with 2 years of freelance experience. While I haven't worked specifically in healthcare, I've designed for various clients including a wellness app and a fitness coaching platform. My portfolio is at: behance.net/jameslee_design" 
          },
          { 
            questionId: "design-q2", 
            answer: "I'm interested in healthcare design because I want to make a meaningful impact with my skills. I believe good design can make healthcare less intimidating and more approachable for patients, especially those who aren't tech-savvy." 
          },
          { 
            questionId: "design-q3", 
            answer: "I'm proficient in Adobe Photoshop, Illustrator, and InDesign. I'm currently learning Figma and have basic knowledge of web design principles." 
          },
        ],
        currentNotes: "Enthusiastic but limited healthcare design experience. Strong potential for growth.",
        currentScore: "6.5",
      },
    ],
  },
  {
    id: "research-fall-2025",
    name: "Research",
    term: "Fall 2025",
    questions: researchApplicationQuestions,
    submissions: [
      {
        id: "emily-rodriguez-rs",
        firstName: "Emily",
        lastName: "Rodriguez",
        email: "emily.rodriguez@example.com",
        appliedDate: "08/13/2024",
        answers: [
          { 
            questionId: "research-q1", 
            answer: "I have extensive research experience including a summer REU program where I studied machine learning applications in medical imaging. I've co-authored two papers on predictive modeling for patient outcomes and have experience with both quantitative and qualitative research methods. I'm currently working on my senior thesis examining the impact of telemedicine on rural healthcare access." 
          },
          { 
            questionId: "research-q2", 
            answer: "Healthcare research has the potential to improve millions of lives. I'm particularly interested in health disparities and how technology can help address inequities in healthcare access. My family immigrated from a region with limited healthcare infrastructure, so I've seen firsthand how research-driven solutions can transform communities." 
          },
          { 
            questionId: "research-q3", 
            answer: "I'm proficient in R, Python (pandas, scikit-learn, matplotlib), SPSS, and qualitative analysis software like NVivo. I have experience with statistical methods including regression analysis, survival analysis, and machine learning techniques. I'm also familiar with systematic literature reviews and meta-analysis methodologies." 
          },
        ],
        currentNotes: "Outstanding research background with publications. Strong methodological skills and clear healthcare focus.",
        currentScore: "9.5",
      },
      {
        id: "david-kim-rs",
        firstName: "David",
        lastName: "Kim",
        email: "david.kim@example.com",
        appliedDate: "08/17/2024",
        answers: [
          { 
            questionId: "research-q1", 
            answer: "I'm a pre-med student with research experience in a biochemistry lab where I studied protein folding mechanisms. I've also conducted independent research on the effectiveness of different study methods for medical students, which resulted in a poster presentation at our university's research symposium." 
          },
          { 
            questionId: "research-q2", 
            answer: "I'm interested in evidence-based medicine and how research can inform better clinical practices. I want to understand how to properly evaluate medical interventions and contribute to the body of knowledge that helps doctors make better decisions for their patients." 
          },
          { 
            questionId: "research-q3", 
            answer: "I have experience with basic statistical analysis in R and Excel. I'm familiar with experimental design principles and literature review methodologies. I'm eager to learn more advanced research tools and techniques." 
          },
        ],
        currentNotes: "Good foundational research experience. Shows potential but needs more advanced methodological training.",
        currentScore: "7.0",
      },
    ],
  },
  {
    id: "stem-events-fall-2025",
    name: "STEM Special Events",
    term: "Fall 2025",
    questions: stemEventsApplicationQuestions,
    submissions: [
      {
        id: "maria-gonzalez-se",
        firstName: "Maria",
        lastName: "Gonzalez",
        email: "maria.gonzalez@example.com",
        appliedDate: "08/11/2024",
        answers: [
          { 
            questionId: "stem-q1", 
            answer: "I have extensive event planning experience as the president of my university's STEM Education Club. I've organized 8 workshops for local high schools, coordinated a science fair with 200+ participants, and managed logistics for guest speaker events. I also volunteered with Girls in STEM, organizing summer camps that reached over 150 young women over two years." 
          },
          { 
            questionId: "stem-q2", 
            answer: "STEM education is crucial for solving tomorrow's challenges, but many students, especially from underrepresented communities, don't see themselves in STEM fields. I'm passionate about creating inclusive, engaging experiences that show students the exciting possibilities in STEM careers. As a first-generation college student, I understand the importance of representation and mentorship in inspiring the next generation." 
          },
          { 
            questionId: "stem-q3", 
            answer: "I bring strong organizational skills, bilingual communication abilities (English/Spanish), social media marketing experience, and a talent for making complex topics accessible to diverse audiences. I'm also skilled at building partnerships with schools and community organizations." 
          },
        ],
        currentNotes: "Exceptional event planning experience with clear passion for STEM outreach. Strong leadership background.",
        currentScore: "9.0",
      },
      {
        id: "alex-thompson-se",
        firstName: "Alex",
        lastName: "Thompson",
        email: "alex.thompson@example.com",
        appliedDate: "08/18/2024",
        answers: [
          { 
            questionId: "stem-q1", 
            answer: "I've volunteered at science museums and helped with a few robotics workshops for middle school students. I also organized study groups for my engineering classes and have experience with social media promotion for my club's events." 
          },
          { 
            questionId: "stem-q2", 
            answer: "I think STEM is really important and I want to help kids get excited about science and engineering. I didn't have many opportunities like this when I was younger, so I want to help provide those experiences for the next generation." 
          },
          { 
            questionId: "stem-q3", 
            answer: "I'm good at explaining technical concepts in simple terms, I'm comfortable speaking in front of groups, and I have experience with video editing and graphic design for promotional materials." 
          },
        ],
        currentNotes: "Limited experience but shows enthusiasm. Could develop with proper mentoring and training.",
        currentScore: "6.0",
      },
    ],
  },
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    questions: generalShadowingApplicationQuestions,
    submissions: [
      {
        id: "jessica-wang-gs",
        firstName: "Jessica",
        lastName: "Wang",
        email: "jessica.wang@example.com",
        appliedDate: "08/10/2024",
        answers: [
          { 
            questionId: "gs-q1", 
            answer: "I'm a junior majoring in biomedical engineering with a minor in computer science. I'm passionate about the intersection of technology and healthcare, and I spend my free time volunteering at the local children's hospital and working on personal coding projects. I'm also part of my university's pre-health society and have been involved in several community health initiatives." 
          },
          { 
            questionId: "gs-q2", 
            answer: "Dream Team Engineering represents exactly what I want to do with my career - using engineering and technology to solve real healthcare problems. The organization's multidisciplinary approach and focus on hands-on experience aligns perfectly with my goals of becoming a physician-engineer. I want to learn from professionals who are bridging the gap between healthcare and technology." 
          },
          { 
            questionId: "gs-q3", 
            answer: "I hope to gain a deeper understanding of how healthcare systems actually work in practice, beyond what I learn in textbooks. I want to observe how technology is currently being used in clinical settings and identify areas where engineering solutions could make a real impact. This experience would help me make more informed decisions about my career path and potentially identify research interests for graduate school." 
          },
        ],
        currentNotes: "Strong technical background with clear healthcare interests. Well-articulated goals and relevant experience.",
        currentScore: "8.5",
      },
      {
        id: "michael-brown-gs",
        firstName: "Michael",
        lastName: "Brown",
        email: "michael.brown@example.com",
        appliedDate: "08/19/2024",
        answers: [
          { 
            questionId: "gs-q1", 
            answer: "I'm a sophomore studying biology with the goal of attending medical school. I've always been interested in healthcare and enjoy learning about how the human body works. I've volunteered at a free clinic and have shadowed a family physician for about 20 hours." 
          },
          { 
            questionId: "gs-q2", 
            answer: "I want to join DTE because I think it would be a good opportunity to learn more about medicine and see different specialties. The program seems well-organized and I think it would look good for medical school applications." 
          },
          { 
            questionId: "gs-q3", 
            answer: "I hope to get exposure to different medical specialties to help me decide what field I might want to pursue. I also want to get more comfortable in clinical environments and learn about the day-to-day responsibilities of physicians." 
          },
        ],
        currentNotes: "Basic pre-med interest but lacks specific connection to DTE's engineering focus. Answers are somewhat generic.",
        currentScore: "5.5",
      },
    ],
  },
];

// Helper function to get individual applicant review data
export async function getIndividualApplicantReviewDisplayData(
  applicationId: string,
  applicantSubmissionId: string
): Promise<IndividualReviewPageDisplayData | undefined> {
  try {
    const response = await axios.get(`http://localhost:3000/api/forms/${applicationId}/entries/${applicantSubmissionId}`);
    const data = response.data as {
      applicationName: string;
      applicationDescription: string;
      applicationQuestions: ApplicationQuestion[];
      applicantSubmission: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        appliedDate: string;
        answers: { questionId: string; answer: string }[];
        currentNotes: string;
        currentScore: string;
      };
    };

    if (!data) {
      console.error(`Applicant submission with ID "${applicantSubmissionId}" not found for application type "${applicationId}".`);
      return undefined;
    }

    return {
      applicationName: data.applicationName,
      applicationDescription: data.applicationDescription,
      applicationQuestions: data.applicationQuestions,
      applicantSubmission: data.applicantSubmission,
    };
  } catch (error) {
    console.error("Error fetching individual applicant review data:", error);
    return undefined;
  }
}

export async function fetchApplicationData(applicationId: string) {
  try {
    const response = await axios.get(`http://localhost:3000/api/forms/${applicationId}/entries`);
    return (response.data as { entries: any[] }).entries;
  } catch (error) {
    console.error("Error fetching application data:", error);
    return [];
  }
}

// Example usage
fetchApplicationData('software-fall-2025').then(data => console.log(data));