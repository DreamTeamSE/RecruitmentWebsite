// src/components/review/ApplicationReviewClientPage.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Applicant } from '@/models/types/application';
import axios from 'axios';
import { getBackendUrl } from '@/lib/constants/string';

// Define the structure for an individual applicant
const ApplicantCard: React.FC<Applicant> = ({ name, appliedDate, score, applicationLink }) => {
  return (
    // Make the card a link if applicationLink is provided
    <Link href={applicationLink || "#"} passHref legacyBehavior={true}>
      <a target={applicationLink && applicationLink !== "#" ? "_blank" : undefined} 
         rel={applicationLink && applicationLink !== "#" ? "noopener noreferrer" : undefined}
         className="block group h-full">
        <div className="bg-background p-3 sm:p-4 rounded-[var(--radius)] shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col justify-between min-h-[90px] border border-border hover:border-primary/50">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-primary group-hover:underline mb-0.5 truncate" title={name}>
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">Applied: {appliedDate}</p>
          </div>
          {score !== undefined && (
            <p className="text-xs text-foreground mt-1 self-end">Score: <span className="font-bold text-lg text-primary">{score.toFixed(1)}</span></p>
          )}
        </div>
      </a>
    </Link>
  );
};

interface FormEntriesResponse {
  formTitle: string;
  entries: {
    id: number;
    applicant_id: number;
    form_id: number;
    submitted_at: string;
    applicant: {
      first_name: string;
      last_name: string;
    } | null;
  }[];
}

export interface ApplicationReviewClientPageProps {
  applicationId: string;
  applicationName: string;
}

export default function ApplicationReviewClientPage({
  applicationId,
  applicationName
}: ApplicationReviewClientPageProps) {
  const [submittedApplicants, setSubmittedApplicants] = useState<Applicant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption] = useState('All Applications');
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Ensure client-side specific logic runs after mount
    async function fetchApplicants() {
      try {
        const response = await axios.get<FormEntriesResponse>(`${getBackendUrl()}/api/forms/${applicationId}/entries`);
        
        // Map the backend response to the frontend Applicant format
        const mappedApplicants: Applicant[] = response.data.entries.map((entry) => ({
          id: entry.id.toString(),
          name: entry.applicant ? `${entry.applicant.first_name} ${entry.applicant.last_name}` : `Applicant ID: ${entry.applicant_id}`,
          appliedDate: new Date(entry.submitted_at).toLocaleDateString(),
          score: undefined,
          applicationLink: `/applications-review/${applicationId}/${entry.id}`,
        }));
        
        setSubmittedApplicants(mappedApplicants);
      } catch (error) {
        console.error("Error fetching applicants:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplicants();
  }, [applicationId]);

  const filteredApplicants = useMemo(() => {
    if (!submittedApplicants) return [];
    return submittedApplicants.filter(applicant =>
      applicant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, submittedApplicants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchTerm);
    // For client-side filtering, this button is optional as filtering happens on input change.
    // If you had server-side search, this would trigger it.
  };

  if (!mounted || isLoading) { // Show loading state until mounted and data is processed
    return (
      <section className="py-12 sm:py-16 bg-[#F3F4F9] min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground font-serif mb-10">
            {applicationName}
          </h1>
          <p className="text-muted-foreground text-lg">Loading applications...</p>
          {/* You could add a spinner component here */}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 bg-[#F3F4F9] min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 relative">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground font-serif">
            {applicationName}
          </h1>
        </div>

        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row items-center justify-center gap-4 sticky top-0 bg-[#F3F4F9]/80 backdrop-blur-md py-4 z-10">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto max-w-md">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search applicant name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary py-2.5 px-4 pl-10 text-sm placeholder-muted-foreground"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <Button type="submit" variant="default" size="default" className="rounded-md px-6">
              Search
            </Button>
          </form>
          <div className="relative"> {/* This would be your DropdownMenu trigger */}
            <Button variant="outline" size="default" className="rounded-md flex items-center gap-2 min-w-[180px] justify-between bg-background text-foreground">
              {filterOption} <ChevronDown size={16} />
            </Button>
            {/* TODO: Implement DropdownMenu content here for filtering options */}
            {/* Example:
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" ... >{filterOption} <ChevronDown /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setFilterOption('All Applications')}>All</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilterOption('Scored')}>Scored</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            */}
          </div>
        </div>

        {filteredApplicants.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredApplicants.map((applicant) => (
              <ApplicantCard key={applicant.id} {...applicant} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10 text-lg">
            {searchTerm ? "No applications found matching your search." : "No submitted applications to display for this role yet."}
          </p>
        )}
      </div>
    </section>
  );
}
