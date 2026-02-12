import { useCallback, useEffect, useState } from "react";

const navItems = [
  { label: "Highlights", href: "#highlights" },
  { label: "Workflow", href: "#workflow" },
  { label: "About", href: "#about" }
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 40);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-30 transition-all duration-500 backdrop-blur ${
        scrolled ? "bg-black/70 border-b border-white/10 shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.4em] text-white/70">
        <div className="font-semibold">
          Research Paper Assistant
        </div>
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="nav-link hover:text-white focus-visible:text-white">
              {item.label}
            </a>
          ))}
          <a href="#cta" className="nav-link text-white">
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
