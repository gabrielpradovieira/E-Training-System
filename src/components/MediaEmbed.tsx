"use client";
/* eslint-disable @next/next/no-img-element */

import { guessMediaKind, type MediaKind } from "@/lib/sharepoint";

/**
 * Renders a media item from a direct URL (see lib/sharepoint.ts for how
 * SharePoint share links become direct URLs). Falls back to a link when
 * the kind can't be embedded.
 */
export default function MediaEmbed({
  url,
  kind,
  alt = "",
  className,
}: {
  url: string;
  kind?: MediaKind;
  alt?: string;
  className?: string;
}) {
  const resolved = kind ?? guessMediaKind(url);

  if (resolved === "image") {
    return <img className={className} src={url} alt={alt} loading="lazy" />;
  }
  if (resolved === "video") {
    return (
      <video className={className} controls preload="metadata">
        <source src={url} />
        Your browser does not support embedded video.
      </video>
    );
  }
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      Open media
    </a>
  );
}
