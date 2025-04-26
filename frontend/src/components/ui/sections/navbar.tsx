import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function Navbar() {
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-[1rem] flex h-16 items-center justify-between px-4">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/transparent_heart.png"
            alt="Logo"
            width={32}
            height={32}
          />
          <span className="text-2xl font-serif tracking-wide text-text">
            RECRUITMENT
          </span>
        </Link>

        {/* Spacer to push nav to right */}
        <div className="flex-1" />

        {/* Nav Links */}
        <nav className="flex items-center gap-6 text-sm font-xl">
          <Link href="/" className="text-text hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/events" className="text-text hover:text-primary transition-colors">
            Events
          </Link>
          <Link href="/applications" className="text-text hover:text-primary transition-colors">
            Applications
          </Link>
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary/80 text-white">
              Staff Login
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
