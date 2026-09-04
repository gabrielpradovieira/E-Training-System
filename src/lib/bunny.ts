export const BUNNY_STREAM_LIBRARY_ID = "741383";

export function bunnyEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}?autoplay=false`;
}
