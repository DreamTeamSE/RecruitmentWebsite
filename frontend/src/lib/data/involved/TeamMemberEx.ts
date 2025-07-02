import TeamMember from "@/models/types/involved";

const teamMembersData: TeamMember[] = [
  {
    id: 1,
    name: "Evan Hadam",
    title: "President",
    imageSrc: "https://placehold.co/400x400/A5B4FC/FFFFFF?text=Evan+H&font=outfit", // Placeholder for grid
    modalImageSrc: "https://placehold.co/600x800/A5B4FC/FFFFFF?text=Evan+Hadam&font=outfit", // Placeholder for modal
    major: "Computer Science",
    graduationYear: "2026",
    hobbies: "Running, swimming, weight lifting, road tripping",
    whyDTE: "I've always been very interested in the medical field and good at programming. DTE is an amazing way to combine these two interests while getting to make people more comfortable along the way!",
    roleInDTE: "DRIFT Team Captain",
    funFact: "As a kid, I wanted to be a street performer when I grew up!",
    contact: "finance@dreamteameng.org",
  },
  // Add 19 more placeholder team members for a total of 20 (as in one of the images)
  ...Array.from({ length: 19 }, (_, i) => ({
    id: i + 2,
    name: `Team Member ${i + 2}`,
    title: `Role ${i + 2}`,
    imageSrc: `https://placehold.co/400x400/E0E7FF/4A6DFF?text=TM+${i + 2}&font=outfit`,
    modalImageSrc: `https://placehold.co/600x800/E0E7FF/4A6DFF?text=Team+Member+${i + 2}&font=outfit`,
    major: "Various Majors",
    graduationYear: "202X",
    hobbies: "Diverse hobbies",
    whyDTE: "Passionate about healthcare innovation and teamwork.",
    roleInDTE: "Valued Team Contributor",
    funFact: "Everyone has a unique fun fact!",
  })),
];

export default teamMembersData;
