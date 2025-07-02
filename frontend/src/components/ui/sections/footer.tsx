"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Assuming you might want icons for socials later, though the image shows text links
// import { Instagram, Linkedin, Youtube } from 'lucide-react';

interface FooterLink {
  href: string;
  label: string;
}

interface LinkColumn {
  title: string;
  links: FooterLink[];
}

const linkColumnsData: LinkColumn[] = [
  {
    title: "Pages",
    links: [
      { href: "/", label: "Home" },
      { href: "/branches", label: "Branches" },
      { href: "/events", label: "Events" },
      { href: "/get-involved", label: "Get Involved" },
      { href: "/media", label: "Media" },
      { href: "/login", label: "Login" },
    ],
  },
  {
    title: "Socials",
    links: [
      { href: "#", label: "Instagram" }, // Replace # with actual URLs
      { href: "#", label: "LinkTree" },
      { href: "#", label: "LinkedIn" },
      { href: "#", label: "YouTube" },
    ],
  },
  {
    title: "Other",
    links: [
      { href: "#", label: "Dream Team Volunteering" }, // Replace #
    ],
  },
];

export default function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    // Changed bg-muted to an explicit hex code to match the image's light lavender/gray
    <footer className="bg-[#E9EBF8] text-muted-foreground"> {/* Updated background color */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Logo, Tagline, Copyright */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/transparent_heart.png" // Ensure this path is correct
                alt="Dream Team Engineering Logo"
                width={64} // Adjust size as needed
                height={64}
                className="rounded-md"
              />
            </Link>
            <p className="text-lg font-semibold text-foreground mb-4 font-serif">
              Dream a better today, design a better tomorrow.
            </p>
            <p className="text-sm mb-1">
              &copy; {currentYear} Dream Team Engineering.
            </p>
            <p className="text-sm mb-6">
              All rights reserved.
            </p>
            <hr className="border-border mb-4" /> {/* Using theme border color */}
            <p className="text-sm">
              Made by Internal Team.
              <Link href="#" className="underline hover:text-primary ml-1">
                Check us out
              </Link>
            </p>
          </div>

          {/* Spacer for medium screens to push link columns to the right */}
          <div className="hidden md:block md:col-span-1 lg:col-span-2"></div>

          {/* Right Columns: Links */}
          <div className="md:col-span-6 lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {linkColumnsData.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
