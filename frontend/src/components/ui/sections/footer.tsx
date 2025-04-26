import Image from "next/image"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full bg-background py-10 px-6 flex flex-col md:flex-row justify-between items-center">
      {/* Left side: Logo (includes text inside) */}
      <div className="flex items-center">
        <Image
          src="/transparent_heart.png" // Make sure the path is correct
          alt="Dream Team Engineering Logo"
          width={100} // Adjust width as needed
          height={100}
        />
      </div>

      {/* Right side: Reach Out and Links */}
      <div className="flex flex-col items-center md:items-end gap-4 mt-8 md:mt-0">
        <h4 className="text-foreground text-xl font-bold md:mr-auto text-center">REACH OUT!</h4>
        <div className="flex gap-12">
          <ul className="space-y-2 text-foreground text-sm">
            <li>
              <Link href="https://instagram.com" target="_blank" className="hover:underline hover:text-primary transition">
                Instagram
              </Link>
            </li>
            <li>
              <Link href="https://yourwebsite.com" target="_blank" className="hover:underline hover:text-primary transition">
                Website
              </Link>
            </li>
          </ul>
          <ul className="space-y-2 text-foreground text-sm">
            <li>
              <Link href="https://facebook.com" target="_blank" className="hover:underline hover:text-primary transition">
                Facebook
              </Link>
            </li>
            <li>
              <Link href="https://linkedin.com" target="_blank" className="hover:underline hover:text-primary transition">
                LinkedIn
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
