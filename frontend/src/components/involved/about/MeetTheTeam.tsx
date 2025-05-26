"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react'; // For the modal close button

interface TeamMember {
  id: number;
  name: string;
  title: string;
  imageSrc: string; // Main image for the grid
  modalImageSrc: string; // Potentially larger/different image for modal
  major: string;
  graduationYear: string;
  hobbies: string;
  whyDTE: string;
  roleInDTE: string;
  funFact: string;
  contact?: string; // Optional contact
}

// Placeholder team member data - replace with your actual data
// For imageSrc and modalImageSrc, use paths to your images in /public or CDN URLs
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

export default function MeetTheTeamSection() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const openModal = (member: TeamMember) => {
    setSelectedMember(member);
    document.body.style.overflow = 'hidden'; // Prevent background scroll when modal is open
  };

  const closeModal = () => {
    setSelectedMember(null);
    document.body.style.overflow = 'auto'; // Restore background scroll
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/30"> {/* Light background from theme */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Meet The Team
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {teamMembersData.map((member) => (
            <div
              key={member.id}
              className="relative group aspect-square rounded-[var(--radius)] overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl"
              onClick={() => openModal(member)}
            >
              <Image
                src={member.imageSrc}
                alt={member.name}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 group-hover:scale-110"
                unoptimized={member.imageSrc.startsWith('https://placehold.co')}
              />
              {/* Overlay for name and title on hover - Updated to light purple */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300 flex flex-col items-center justify-center text-center p-2 opacity-0 group-hover:opacity-100">
                <h3 className="text-sm sm:text-base font-semibold text-white">{member.name}</h3>
                <p className="text-xs sm:text-sm text-primary-foreground/80">{member.title}</p> {/* Use primary-foreground for contrast on primary bg */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedMember && (
        // Updated modal backdrop: very light gray, transparent, with blur
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-200/80 backdrop-blur-sm">
          {/* Modal card: explicitly white background */}
          <div className="relative bg-white rounded-[var(--radius)] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <button
              onClick={closeModal}
              aria-label="Close modal"
              // Modal close button: dark gray, hover darker (or theme's foreground)
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Modal Image */}
              <div className="md:col-span-1 relative aspect-[3/4] rounded-[var(--radius)] overflow-hidden">
                <Image
                  src={selectedMember.modalImageSrc}
                  alt={selectedMember.name}
                  layout="fill"
                  objectFit="cover"
                  unoptimized={selectedMember.modalImageSrc.startsWith('https://placehold.co')}
                />
              </div>

              {/* Modal Text Content - Reverted to dark text for contrast on white background */}
              <div className="md:col-span-2 space-y-3 text-sm text-muted-foreground"> {/* Default text color for details */}
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-serif">
                  {selectedMember.name}
                </h2>
                <p className="text-lg text-primary font-semibold">{selectedMember.title}</p>
                
                <div className="space-y-1 pt-2">
                  <p><strong className="text-foreground/90 font-medium">Major:</strong> {selectedMember.major}</p>
                  <p><strong className="text-foreground/90 font-medium">Graduation Year:</strong> {selectedMember.graduationYear}</p>
                  <p><strong className="text-foreground/90 font-medium">Hobbies:</strong> {selectedMember.hobbies}</p>
                  <p><strong className="text-foreground/90 font-medium">Why Dream Team Engineering?:</strong> {selectedMember.whyDTE}</p>
                  <p><strong className="text-foreground/90 font-medium">Role in DTE:</strong> {selectedMember.roleInDTE}</p>
                  <p><strong className="text-foreground/90 font-medium">Fun Fact:</strong> {selectedMember.funFact}</p>
                  {selectedMember.contact && (
                    <p><strong className="text-foreground/90 font-medium">Contact:</strong> <a href={`mailto:${selectedMember.contact}`} className="text-primary hover:underline">{selectedMember.contact}</a></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
