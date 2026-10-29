"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-7 rounded-full text-[10px]",
  sm: "size-9 rounded-full text-xs",
  md: "size-16 rounded-full text-lg",
  lg: "h-40 w-30 rounded-lg text-3xl",
};

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * A student's photo from the API (private, signed-in only), or their initials when there is no
 * photo or it cannot be loaded. `src` is a photo_url / thumbnail_url from the API.
 */
export function StudentPhoto({ src, name, size = "sm", className }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const box = cn("relative shrink-0 overflow-hidden bg-muted", SIZES[size], className);
  if (!src || failedSrc === src) {
    return (
      <span className={cn(box, "flex items-center justify-center font-medium text-muted-foreground")} aria-hidden>
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private, authenticated image from the API
    <img
      src={src}
      alt={name ? `Photo of ${name}` : "Student photo"}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={cn(box, "object-cover")}
    />
  );
}
