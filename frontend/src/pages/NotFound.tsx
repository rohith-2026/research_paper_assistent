import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f0d] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-6xl font-semibold">404</div>

        <div className="text-white/60 text-sm">
          This page doesn’t exist.
        </div>

        <Link
          to="/"
          className="inline-block px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
