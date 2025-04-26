import Image from "next/image"
import { Button } from "../ui/button"

export default function Branches() {
  return (
    <section className="w-screen flex flex-col items-center">
      <h1 className="mb-12 text-foreground">Branches</h1>

      <div className="flex flex-col w-full">
        {/* Design */}
        <div className="flex flex-col md:flex-row-reverse w-full overflow-hidden h-[40vh]">
          {/* Image Right on desktop */}
          <div className="relative min-h-[300px] w-full md:w-1/2">
            <Image
              src="/home/design.avif"
              alt="Design Team"
              fill
              className="object-cover object-top"
            />
          </div>
          {/* Text Left */}
          <div className="flex flex-col items-center justify-center bg-secondary-accent text-card p-10 w-full md:w-1/2">
            <h2>Design</h2>
            <a href="https://www.dreamteameng.org/design" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="medium" className="text-md">
                Explore
              </Button>
            </a>
          </div>
        </div>

        {/* Software */}
        <div className="flex flex-col md:flex-row w-full overflow-hidden">
          {/* Image Left on desktop */}
          <div className="relative min-h-[300px] w-full md:w-1/2">
            <Image
              src="/home/software.avif"
              alt="Software Team"
              fill
              className="object-cover object-top"
            />
          </div>
          {/* Text Right */}
          <div className="flex flex-col items-center justify-center bg-secondary text-card p-10 w-full md:w-1/2 h-[40vh]">
            <h2>Software</h2>
            <a href="https://www.dreamteameng.org/software" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="medium" className="text-md">
                Explore
              </Button>
            </a>
          </div>
        </div>

        {/* Research */}
        <div className="flex flex-col md:flex-row-reverse w-full overflow-hidden">
          {/* Image Right on desktop */}
          <div className="relative min-h-[300px] w-full md:w-1/2">
            <Image
              src="/home/research.avif"
              alt="Research Team"
              fill
              className="object-cover object-top"
            />
          </div>
          {/* Text Left */}
          <div className="flex flex-col items-center justify-center bg-secondary-accent text-card p-10 w-full md:w-1/2 h-[40vh]">
            <h2>Research</h2>
            <a href="https://www.dreamteameng.org/research" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="medium" className="text-md">
                Explore
              </Button>
            </a>
          </div>
        </div>

        {/* Shadowing */}
        <div className="flex flex-col md:flex-row w-full overflow-hidden">
          {/* Image Left on desktop */}
          <div className="relative min-h-[300px] w-full md:w-1/2">
            <Image
              src="/home/shadowing.avif"
              alt="Shadowing Team"
              fill
              className="object-cover object-top"
            />
          </div>
          {/* Text Right */}
          <div className="flex flex-col items-center justify-center bg-secondary text-card p-10 w-full md:w-1/2 h-[40vh]">
            <h2>Shadowing</h2>
            <a href="https://www.dreamteameng.org/shadowing" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="medium" className="text-md">
                Explore
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
