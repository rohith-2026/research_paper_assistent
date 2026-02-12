import clsx from "clsx";

type LogoProps = {
  size?: number;
  className?: string;
  showText?: boolean;
  title?: string;
  subtitle?: string;
};

export default function Logo({
  size = 32,
  className,
  showText = true,
  title = "Research Paper Assistant",
  subtitle = "AI-Powered",
}: LogoProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <img
        src="/logo.png"
        width={size}
        height={size}
        alt="Research Paper Assistant logo"
        className="object-contain"
        loading="eager"
        decoding="async"
      />

      {showText && (
        <div className="leading-tight">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-white/50">{subtitle}</div>
        </div>
      )}
    </div>
  );
}
