import { cn } from "../../utils/cn";

type SkeletonProps = {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const radiusMap = {
  sm: "rounded-[12px]",
  md: "rounded-[16px]",
  lg: "rounded-[20px]",
  xl: "rounded-[24px]",
  full: "rounded-full",
};

export default function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", radiusMap[rounded], className)}
      aria-hidden="true"
    />
  );
}
