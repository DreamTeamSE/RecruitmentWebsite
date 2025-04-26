import Link from "next/link";

export default function Vision() {
    return (
      <div className="flex flex-col items-center justify-center p-6 pt-[64px]">
        {/* Group Image */}
        <div className="max-w-[800px] w-[90vw] overflow-hidden rounded-2xl shadow-sm">
          <img
            src="/home/home.jpg"
            alt="Recruitment Group Photo"
            className="object-cover rounded-2xl"
          />
        </div>
  
  
        {/* Tagline */}
        <h2 className="text-center">
          From Vision to Impact
        </h2>
  
        {/* Join Button */}
        <div>
          <Link href="/applications">
            <button className="bg-primary hover:bg-primary/90 text-white md:text-[1.5em] sm:text-[1.25em] text-[em] py-[.125em] px-[4.5em] rounded-xl">
              Join Today
            </button>
          </Link>
        </div>
      </div>
    );
  }
  