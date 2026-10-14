import MuiAvatar from "@mui/material/Avatar";

const SIZES = { sm: 32, md: 40, lg: 56 } as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  /** Decorative when the name is already visible next to it. */
  decorative?: boolean;
}

export function Avatar({ name, src, size = "md", decorative = false }: AvatarProps) {
  const px = SIZES[size];
  return (
    <MuiAvatar
      src={src}
      alt={decorative ? "" : name}
      aria-hidden={decorative || undefined}
      sx={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {initials(name)}
    </MuiAvatar>
  );
}
