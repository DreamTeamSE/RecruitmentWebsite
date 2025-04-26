import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function Navbar() {
  return (
    <header className="w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <Image
            src="/transparent_heart.png"
            alt="Logo"
            width={32}
            height={32}
          />
          <span className="text-2xl font-serif tracking-wide text-black">RECRUITMENT</span>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-black hover:text-[#4A6DFF] transition-colors">
            Home
          </Link>
          <Link href="/events" className="text-black hover:text-[#4A6DFF] transition-colors">
            Events
          </Link>
          <Link href="/applications" className="text-black hover:text-[#4A6DFF] transition-colors">
            Applications
          </Link>
          <Link href="/login">
            <Button className="bg-[#7087DC] hover:bg-[#4A6DFF] text-white">
              Staff Login
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
