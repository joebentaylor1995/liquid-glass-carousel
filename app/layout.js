import localFont from "next/font/local";
import "./globals.css";

// loaded through next/font so the URL picks up the base path when the site is
// hosted under a sub-path
const carouselFont = localFont({
  src: "../public/font.woff",
  variable: "--font-carousel",
  display: "swap",
});

export const metadata = {
  title: "WebGL Glass Carousel",
  description:
    "Infinite drag-driven portfolio carousel with a liquid-glass lens shader — three.js.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={carouselFont.variable}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
