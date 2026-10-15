import { Fragment, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { InlineAlert, Link } from "@/design-system";

// A small, safe Markdown subset for texts admins write (ADR-0021): ## headings, - and 1.
// lists, > notes, **bold**, *italic* and [links](/path). It builds React elements, never
// HTML, so nothing an admin types can run as code.

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "note"; text: string }
  | { kind: "paragraph"; lines: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of source.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) continue;
    const first = lines[0] ?? "";
    const heading = /^(#{2,4})\s+(.*)$/.exec(first);
    if (heading && lines.length === 1) {
      blocks.push({ kind: "heading", level: (heading[1]?.length ?? 2) === 2 ? 2 : 3, text: heading[2] ?? "" });
      continue;
    }
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      blocks.push({ kind: "list", ordered: false, items: lines.map((line) => line.replace(/^\s*[-*]\s+/, "")) });
      continue;
    }
    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      blocks.push({ kind: "list", ordered: true, items: lines.map((line) => line.replace(/^\s*\d+[.)]\s+/, "")) });
      continue;
    }
    if (lines.every((line) => line.startsWith(">"))) {
      blocks.push({ kind: "note", text: lines.map((line) => line.replace(/^>\s?/, "")).join(" ") });
      continue;
    }
    // A heading line followed by text in the same chunk.
    if (heading) {
      blocks.push({ kind: "heading", level: (heading[1]?.length ?? 2) === 2 ? 2 : 3, text: heading[2] ?? "" });
      blocks.push({ kind: "paragraph", lines: lines.slice(1) });
      continue;
    }
    blocks.push({ kind: "paragraph", lines });
  }
  return blocks;
}

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*(.+?)\*/g;
const SAFE_HREF = /^(?:\/(?!\/)|#|https?:\/\/|tel:|mailto:)/;

/** Bold, italic and links inside one line. */
function inline(text: string, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const key = `${keyPrefix}${index}`;
    if (match[1] !== undefined) out.push(<strong key={key}>{inline(match[1], `${key}-`)}</strong>);
    else if (match[2] !== undefined && match[3] !== undefined) {
      const href = match[3];
      if (!SAFE_HREF.test(href)) out.push(match[2]);
      else if (href.startsWith("/") || href.startsWith("#")) out.push(<Link key={key} to={href}>{match[2]}</Link>);
      else out.push(<Link key={key} href={href}>{match[2]}</Link>);
    } else out.push(<em key={key}>{inline(match[4] ?? "", `${key}-`)}</em>);
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders admin-written text; `inverse` for dark backgrounds. */
export function Markdown({ text, inverse = false, size = "body1" }: { text: string; inverse?: boolean; size?: "body1" | "bodyLg" }) {
  const { tokens } = useTheme();
  const muted = inverse ? "rgba(255,255,255,0.86)" : tokens.neutral[700];
  const strong = inverse ? tokens.neutral[0] : tokens.neutral[900];
  const blocks = parseBlocks(text);

  return (
    <Box sx={{ display: "grid", gap: 4, color: muted, "& strong": { color: strong, fontWeight: 600 }, "& a": inverse ? { color: tokens.neutral[0] } : {} }}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <Typography key={index} variant={block.level === 2 ? "h2" : "h3"} component={block.level === 2 ? "h2" : "h3"} sx={{ color: strong, mt: index === 0 ? 0 : 4 }}>
              {inline(block.text)}
            </Typography>
          );
        }
        if (block.kind === "note") {
          return (
            <InlineAlert key={index} tone="info">
              {inline(block.text)}
            </InlineAlert>
          );
        }
        if (block.kind === "list") {
          return (
            <Box
              key={index}
              component={block.ordered ? "ol" : "ul"}
              sx={{
                m: 0,
                pl: 6,
                display: "grid",
                gap: 2,
                "& li": { typography: size, pl: 1 },
                "& li::marker": { color: inverse ? tokens.accent[200] : tokens.accent[600], fontWeight: 600 },
              }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </Box>
          );
        }
        return (
          <Typography key={index} variant={size} component="p" sx={{ m: 0 }}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </Typography>
        );
      })}
    </Box>
  );
}
