import React from "react";
import CarouselSection from "@/Components/CarouselSection";

// A full-height section either side of the carousel: the page scrolls
// straight past it, and the row only ever moves when you drag it or use the
// arrows.
const page = () => {
  return (
    <main className="bg-white text-black">
      <section className="flex h-[100dvh] w-full items-center px-[8vw]">
        <div className="max-w-[560px]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">
            + Featured results
          </p>
          <h1 className="mt-6 text-[38px] leading-[1.2]">
            Bold ideas, considered design, and immersive digital experiences
            built to leave a lasting impression.
          </h1>
          <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-black/40">
            Scroll ↓
          </p>
        </div>
      </section>

      <CarouselSection />

      <section className="flex h-[100dvh] w-full items-center px-[8vw]">
        <div className="max-w-[560px]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">
            + Next
          </p>
          <h2 className="mt-6 text-[38px] leading-[1.2]">
            Keep scrolling — the carousel stays exactly where you left it.
          </h2>
        </div>
      </section>
    </main>
  );
};

export default page;
