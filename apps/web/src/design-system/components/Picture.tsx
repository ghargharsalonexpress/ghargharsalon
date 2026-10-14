import { type ImageRef, mediaUrl } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { MEDIA_BASE_URL } from "@/lib/media";

type Ratio = string | { xs: string; sm?: string; md?: string };

export interface PictureProps {
  image: ImageRef | null;
  /** Describes the photo. Empty for decorative photos next to a visible name. */
  alt: string;
  /** e.g. "(min-width: 900px) 33vw, 50vw", or a number for a fixed width in px: tells the browser which size to fetch. */
  sizes: string | number;
  ratio: Ratio;
  /** Shown on the neutral tile when there's no photo (plan B6: never a fake photo). */
  placeholder?: string;
  /** Above-the-fold images load eagerly with high priority (LCP). */
  priority?: boolean;
  radius?: "sm" | "md" | "lg";
  /** CSS object-position, to keep the subject in frame when the ratio crops the photo. */
  position?: string;
  /** Where the files live; defaults to catalogue media. Site photos use "" (the web app's /images). */
  baseUrl?: string;
  sx?: SxProps<Theme>;
}

/** AVIF with WebP fallback, responsive sizes, fixed aspect ratio so nothing jumps (CLS). */
export function Picture({ image, alt, sizes, ratio, placeholder, priority = false, radius = "md", position = "center", baseUrl = MEDIA_BASE_URL, sx }: PictureProps) {
  const { tokens } = useTheme();
  const shape = { aspectRatio: ratio, width: "100%", borderRadius: `${tokens.radius[radius]}px`, overflow: "hidden", bgcolor: tokens.neutral[100] } as const;

  if (!image) {
    return (
      <Box aria-hidden sx={{ ...shape, display: "flex", alignItems: "flex-end", p: 3, ...sx }}>
        {placeholder && (
          <Typography variant="caption" component="span" sx={{ color: tokens.neutral[600] }}>
            {placeholder}
          </Typography>
        )}
      </Box>
    );
  }

  const sizesAttr = typeof sizes === "number" ? `${sizes}px` : sizes;
  const srcSet = (format: "avif" | "webp") => image.widths.map((width) => `${mediaUrl(baseUrl, image, width, format)} ${width}w`).join(", ");
  const fallbackWidth = image.widths.find((width) => width >= 640) ?? image.widths[image.widths.length - 1] ?? image.width;

  return (
    <Box component="picture" sx={{ ...shape, display: "block", ...sx }}>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizesAttr} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizesAttr} />
      <Box
        component="img"
        src={mediaUrl(baseUrl, image, fallbackWidth, "webp")}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" } : {})}
        sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position, display: "block" }}
      />
    </Box>
  );
}
