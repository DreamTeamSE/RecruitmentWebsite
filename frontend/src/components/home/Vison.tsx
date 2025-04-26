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
        <h2 className="h2 font-semibold mt-[48px] text-center">
          From Vision to Impact
        </h2>
  
        {/* Join Button */}
        <div className="mt-[24px]">
          <a href="/apply">
            <button className="bg-primary hover:bg-primary/90 text-white md:text-[1.5em] sm:text-[1.25em] text-[em] font-semibold py-[.125em] px-[4.5em] rounded-xl">
              Join Today
            </button>
          </a>
        </div>
      </div>
    );
  }
  