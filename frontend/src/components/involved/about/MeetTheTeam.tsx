"use client";

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import TeamMember from '@/models/types/involved';
import teamMembersData from '@/lib/data/involved/TeamMemberEx';
import { useModal } from '@/lib/hooks/useModal';

export default function MeetTheTeamSection() {
  const { isOpen, data: selectedMember, open, close } = useModal<TeamMember>();

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Meet The Team</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {teamMembersData.map((member) => (
            <div
              key={member.id}
              className="relative group aspect-square rounded-[var(--radius)] overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl"
              onClick={() => open(member)}
            >
              <Image
                src={member.imageSrc}
                alt={member.name}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 group-hover:scale-110"
                unoptimized={member.imageSrc.startsWith('https://placehold.co')}
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-all duration-300 flex flex-col items-center justify-center text-center p-2 opacity-0 group-hover:opacity-100">
                <h3 className="text-sm sm:text-base font-semibold text-white">{member.name}</h3>
                <p className="text-xs sm:text-sm text-primary-foreground/80">{member.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-200/80 backdrop-blur-sm">
          <div className="relative bg-white rounded-[var(--radius)] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <button
              onClick={close}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 relative aspect-[3/4] rounded-[var(--radius)] overflow-hidden">
                <Image
                  src={selectedMember.modalImageSrc}
                  alt={selectedMember.name}
                  layout="fill"
                  objectFit="cover"
                  unoptimized={selectedMember.modalImageSrc.startsWith('https://placehold.co')}
                />
              </div>

              <div className="md:col-span-2 space-y-3 text-sm text-muted-foreground">
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
                    <p>
                      <strong className="text-foreground/90 font-medium">Contact:</strong>{' '}
                      <a href={`mailto:${selectedMember.contact}`} className="text-primary hover:underline">
                        {selectedMember.contact}
                      </a>
                    </p>
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
