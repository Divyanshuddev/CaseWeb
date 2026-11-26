"use client";

export function RedPushpin({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "w-3.5 h-3.5"
      : size === "lg"
        ? "w-6 h-6"
        : "w-4.5 h-4.5 w-[18px] h-[18px]";

  return (
    <span
      className={`inline-block rounded-full relative select-none ${dims} ${className}`}
      style={{
        background:
          "radial-gradient(circle at 32% 28%, #eb646b 0%, #B3262E 55%, #661116 100%)",
        boxShadow:
          "0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.38)",
        border: "1px solid #4d0c10",
      }}
      aria-hidden="true"
    >
      <span
        className="absolute top-[22%] left-[24%] w-[28%] h-[28%] rounded-full bg-white/50"
        aria-hidden="true"
      />
    </span>
  );
}
