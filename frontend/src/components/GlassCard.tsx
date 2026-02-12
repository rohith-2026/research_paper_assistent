import React from "react";
import clsx from "clsx";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export default function GlassCard({ className, children, ...rest }: GlassCardProps) {
  return (
    <div
      {...rest}
      className={clsx(
        "rounded-[24px] border border-[var(--panelBorder)] bg-[var(--panel)] backdrop-blur-xl",
        "shadow-[var(--shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
