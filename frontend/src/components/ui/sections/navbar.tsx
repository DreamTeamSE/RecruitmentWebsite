"use client"; // Mark this as a Client Component

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button"; // Assuming this uses the buttonVariants from the Canvas
import { Menu, X, ChevronDown, FileText, Home as HomeIcon, Briefcase, CalendarDays, Users, Tv } from 'lucide-react'; // Added more specific icons
import UserMenu from '@/components/auth/UserMenu';
import type { AuthenticatedUser } from '@/models/types/auth';
import { useViewMode } from '@/contexts/ViewModeContext';

interface NavSubLinkItem {
  href: string;
  label: string;
}
interface NavLinkItem {
  href: string;
  label: string;
  sublinks?: NavSubLinkItem[]; // Optional array for sublinks
  icon?: React.ReactNode; // Optional icon for mobile menu
  requiresAuth?: boolean; // New property to indicate if link requires auth
}

// Colors and styles based on the image for an exact match using explicit values
const activeLinkBgColor = "bg-[#E0E7FF]"; // Light lavender/periwinkle for active link background
const activeLinkTextColor = "text-black";   // Black text for active link
const inactiveLinkTextColor = "text-black"; // Black text for inactive links
const navbarOutlineColor = "border-[#A5B4FC]"; // Light blue outline

const baseNavLinks: NavLinkItem[] = [
  { href: "/", label: "Home", icon: <HomeIcon size={18} /> },
  {
    href: "/branches",
    label: "Branches",
    icon: <Briefcase size={18} />,
    sublinks: [
      { href: "/branches/design", label: "Design" },
      { href: "/branches/software", label: "Software" },
      { href: "/branches/research", label: "Research" },
      { href: "/branches/shadowing", label: "Shadowing" },
    ]
  },
  { href: "/events", label: "Events", icon: <CalendarDays size={18} /> },
  {
    href: "/get-involved",
    label: "Get Involved",
    icon: <Users size={18} />,
    sublinks: [
      { href: "/get-involved/about-us", label: "About Us" },
      { href: "/get-involved/join-dte", label: "Join DTE" },
      { href: "/get-involved/sponsor-us", label: "Sponsor Us" },
      { href: "/get-involved/contact", label: "Contact" },
    ]
  },
  { href: "", label: "Applications", icon: <FileText size={18} />, requiresAuth: true }, // Dynamic Applications link
  { href: "/media", label: "Media", icon: <Tv size={18} /> },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isAdminMode } = useViewMode();

  // Filter nav links based on authentication status and set dynamic href
  const navLinks = baseNavLinks.filter(link => {
    if (link.requiresAuth) {
      return status === 'authenticated' && (session?.user as AuthenticatedUser)?.emailVerified;
    }
    return true;
  }).map(link => {
    // Set dynamic href for Applications link based on view mode
    if (link.label === "Applications" && link.requiresAuth) {
      return {
        ...link,
        href: isAdminMode ? "/applications-review" : "/get-involved/join-dte"
      };
    }
    return link;
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const handleMouseEnter = (label: string) => {
    if (window.innerWidth >= 768) {
      setOpenDropdown(label);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) {
      setOpenDropdown(null);
    }
  };

  const handleDropdownLinkClick = () => {
    setOpenDropdown(null);
    closeMobileMenu();
  };

  useEffect(() => {
    // Close mobile menu if pathname changes
    // This was causing an infinite loop with closeMobileMenu also setting state
    // Let's simplify: just close the menu, don't reset dropdown here as it might be needed for desktop
    if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        closeMobileMenu(); // This is fine as it only closes, doesn't affect dropdown state for desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]); // Only re-run if isMobileMenuOpen changes
  
  // Filter navLinks based on authentication status
  const navLinksToDisplay = navLinks;

  return (
    <>
      <header className={`max-w-5xl mx-auto my-3 sm:my-4 bg-white rounded-full shadow-xl p-1.5 sm:p-2 border-2 ${navbarOutlineColor}`}>
        <div className="flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4">
          <Link
            href="/"
            className="flex items-center flex-shrink-0"
            onClick={() => { if(isMobileMenuOpen) closeMobileMenu();}} // Close mobile menu on logo click if open
          >
            <Image
              src="/transparent_heart.png"
              alt="Recruitment Logo"
              width={32}
              height={32}
              className="rounded-md"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-x-1.5 lg:gap-x-2 text-sm">
            {navLinksToDisplay.map((link) => { // Use filtered links
              const isActive = pathname === link.href && !link.sublinks;
              const isDropdownParentActive = link.sublinks?.some(sublink => pathname === sublink.href);
              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.sublinks && handleMouseEnter(link.label)}
                  onMouseLeave={() => link.sublinks && handleMouseLeave()}
                >
                  <Link
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md transition-colors font-medium whitespace-nowrap flex items-center
                      ${(isActive || (isDropdownParentActive && link.sublinks) ) 
                        ? `${activeLinkBgColor} ${activeLinkTextColor} hover:opacity-90`
                        : `${inactiveLinkTextColor} hover:text-gray-700 hover:bg-gray-100/70`
                      }`}
                    // onClick for desktop links usually just navigates. Mobile menu closure handled by main close function.
                  >
                    {link.label}
                    {link.sublinks && <ChevronDown size={16} className={`ml-1 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />}
                  </Link>
                  {link.sublinks && openDropdown === link.label && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                      {link.sublinks.map((sublink) => (
                        <Link
                          key={sublink.label}
                          href={sublink.href}
                          className={`block px-4 py-2 text-sm ${pathname === sublink.href ? activeLinkTextColor + ' ' + activeLinkBgColor : inactiveLinkTextColor} hover:bg-gray-100/70`}
                          onClick={handleDropdownLinkClick} // This closes mobile menu too
                        >
                          {sublink.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <UserMenu />
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
                className={`${inactiveLinkTextColor} hover:text-gray-700`}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 mx-auto max-w-5xl px-2 sm:px-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-lg">
                <nav className="flex flex-col"> {/* Removed space-y-1 for tighter control */}
                    {navLinksToDisplay.map((link) => ( // Use filtered links
                      <div key={link.label} className="border-b border-gray-100 last:border-b-0"> {/* Add borders between items */}
                        <div
                          className={`px-3 py-3 text-base font-medium flex justify-between items-center cursor-pointer
                            ${(pathname === link.href && !link.sublinks) || (link.sublinks?.some(sublink => pathname === sublink.href)) ? `${activeLinkBgColor} ${activeLinkTextColor}` : `${inactiveLinkTextColor} hover:bg-gray-100/70`}
                          `}
                          onClick={() => {
                            if (link.sublinks) {
                              setOpenDropdown(openDropdown === link.label ? null : link.label);
                            } else {
                               if (link.href && link.href !== "#") { // Check if href exists before trying to navigate
                                   // For Link components, clicking them will navigate.
                                   // We just need to close the mobile menu.
                                   // Using Next.js Link component handles navigation.
                               }
                               closeMobileMenu(); // Close menu on direct link click
                            }
                          }}
                        >
                          {link.href && link.href !== "#" && !link.sublinks ? (
                            <Link href={link.href} onClick={closeMobileMenu} className="flex-grow flex items-center">
                                {link.icon && <span className="mr-3">{link.icon}</span>}
                                {link.label}
                            </Link>
                          ) : (
                            <span className="flex-grow flex items-center">
                                {link.icon && <span className="mr-3">{link.icon}</span>}
                                {link.label}
                            </span>
                          )}
                          {link.sublinks && <ChevronDown size={20} className={`transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />}
                        </div>
                        {link.sublinks && openDropdown === link.label && (
                          <div className="pl-8 pr-3 py-1 bg-gray-50"> {/* Indented sublinks with slight bg change */}
                            {link.sublinks.map((sublink) => (
                              <Link
                                key={sublink.label}
                                href={sublink.href}
                                className={`block px-3 py-2 rounded-md text-sm font-medium
                                  ${pathname === sublink.href ? `${activeLinkBgColor} ${activeLinkTextColor}` : `${inactiveLinkTextColor} hover:bg-gray-100/70`}
                                `}
                                onClick={handleDropdownLinkClick}
                              >
                                {sublink.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* User menu for mobile */}
                    <div className="p-3 mt-2 border-t border-gray-200">
                        <UserMenu />
                    </div>
                </nav>
            </div>
        </div>
      )}
    </>
  );
}
