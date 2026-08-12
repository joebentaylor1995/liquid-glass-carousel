import React from "react";
import Link from "next/link";
import { PROJECTS } from "@/lib/carousel/config";

// every project's slug, so the static export knows what to prerender
export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.href.split("/").pop() }));
}

// Stand-in destination for the carousel links, so clicking a panel actually
// lands somewhere. Swap this for the real case-study page.
export default async function WorkPage({ params }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.href === `/work/${slug}`);

  return (
    <main className="flex h-[100dvh] w-full items-center bg-white px-[8vw] text-black">
      <div className="max-w-[560px]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">
          {project ? project.subtitle : "Work"}
        </p>
        <h1 className="mt-6 text-[38px] leading-[1.2]">
          {project ? project.title : "Case study coming soon."}
        </h1>
        <Link
          href="/"
          className="mt-10 inline-block text-[11px] uppercase tracking-[0.18em] text-black/40 hover:text-black"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
