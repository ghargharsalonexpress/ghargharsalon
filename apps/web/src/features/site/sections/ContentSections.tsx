import { useState } from "react";
import { type Localized, type SectionOf, youtubeId } from "@brand/shared";
import AndroidOutlined from "@mui/icons-material/AndroidOutlined";
import Apple from "@mui/icons-material/Apple";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import FormatQuoteRounded from "@mui/icons-material/FormatQuoteRounded";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, FaqList, Link, Picture } from "@/design-system";
import { imageSrc, videoSrc } from "@/lib/media";
import { reviewsQuery, useSite } from "../api";
import { FeatureIconView } from "../icons";
import { Markdown } from "../Markdown";
import { useText } from "../text";
import { Carousel, CtaButton, Reveal, SectionHeading, SectionShell } from "./parts";
import { titleId, useTone } from "./tone";

/** The header of an inner page: title, a line about it, an optional photo and button. */
export function PageHeaderSection({ section, first }: { section: SectionOf<"pageHeader">; first: boolean }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const image = section.image;

  return (
    <SectionShell section={section} sx={{ py: { xs: 10, md: image ? 14 : 16 } }}>
      <Box sx={{ display: "grid", gap: { xs: 8, md: 14 }, alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: image ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)" } }}>
        <Box sx={{ maxWidth: image ? 600 : 760 }}>
          {text(section.eyebrow) && (
            <Typography variant="label" component="p" sx={{ m: 0, mb: 3, color: tone.eyebrow, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
              {text(section.eyebrow)}
            </Typography>
          )}
          <Typography id={titleId(section)} variant="h1" component={first ? "h1" : "h2"} sx={{ color: tone.fg, fontSize: { xs: "2rem", md: "2.75rem" }, lineHeight: 1.15 }}>
            {text(section.title)}
          </Typography>
          {text(section.subtitle) && (
            <Typography variant="bodyLg" component="p" sx={{ mt: 4, color: tone.muted, maxWidth: "60ch" }}>
              {text(section.subtitle)}
            </Typography>
          )}
          {section.primary.href && (
            <Box sx={{ mt: 8 }}>
              <CtaButton cta={section.primary} size="lg" />
            </Box>
          )}
        </Box>
        {image && (
          <Box sx={{ position: "relative", pb: { xs: 3, md: 0 }, pr: { xs: 3, md: 0 } }}>
            <Box aria-hidden sx={{ position: "absolute", inset: { xs: "12px 0 0 12px", md: "24px -24px -24px 24px" }, borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.accent[100] }} />
            <Picture image={image} alt="" sizes="(min-width: 900px) 560px, 100vw" ratio="4 / 3" radius="lg" priority={first} sx={{ position: "relative", boxShadow: tokens.elevation.e2 }} />
          </Box>
        )}
      </Box>
    </SectionShell>
  );
}

/** Promotion cards with a photo, a badge and a button. */
export function OffersSection({ section }: { section: SectionOf<"offers"> }) {
  const { t } = useTranslation("public");
  const text = useText();
  const tone = useTone(section.tone);
  const cards = section.items.map((item, index) => <OfferCard key={index} item={item} tall={section.items.length === 1} />);

  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      {section.items.length <= 2 ? (
        <Box sx={{ display: "grid", gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: "1fr", md: section.items.length === 2 ? "1fr 1fr" : "1fr" } }}>{cards}</Box>
      ) : (
        <Carousel label={text(section.title) || t("site.offers")} columns={{ xs: 1.1, sm: 1.6, md: 3, lg: 3 }} inverse={tone.inverse}>
          {cards}
        </Carousel>
      )}
    </SectionShell>
  );
}

function OfferCard({ item, tall }: { item: SectionOf<"offers">["items"][number]; tall: boolean }) {
  const { tokens } = useTheme();
  const text = useText();
  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        borderRadius: `${tokens.radius.lg}px`,
        overflow: "hidden",
        minHeight: { xs: 300, md: tall ? 380 : 340 },
        display: "flex",
        alignItems: "flex-end",
        bgcolor: tokens.accent[700],
        "& img": { transition: "transform 700ms ease" },
        "@media (hover: hover)": { "&:hover img": { transform: "scale(1.05)" } },
      }}
    >
      {item.image && <Picture image={item.image} alt="" sizes="(min-width: 900px) 400px, 90vw" ratio="auto" radius="lg" sx={{ position: "absolute", inset: 0, height: "100%", borderRadius: 0 }} />}
      <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,12,0.05) 20%, rgba(20,16,12,0.85) 100%)" }} />
      <Box sx={{ position: "relative", p: { xs: 5, md: 6 }, color: tokens.neutral[0], width: "100%" }}>
        {text(item.badge) && (
          <Box component="span" sx={{ display: "inline-block", mb: 3, px: 2.5, py: 0.75, borderRadius: 999, bgcolor: tokens.accent[600], color: tokens.neutral[0], typography: "caption", fontWeight: 600, letterSpacing: "0.04em" }}>
            {text(item.badge)}
          </Box>
        )}
        <Typography variant="h3" component="h3" sx={{ color: tokens.neutral[0], fontSize: { xs: "1.375rem", md: "1.5rem" }, lineHeight: 1.25 }}>
          {text(item.title)}
        </Typography>
        {text(item.subtitle) && (
          <Typography variant="body2" component="p" sx={{ mt: 2, color: "rgba(255,255,255,0.88)", maxWidth: "42ch" }}>
            {text(item.subtitle)}
          </Typography>
        )}
        {item.cta.href && (
          <Box sx={{ mt: 5 }}>
            <CtaButton cta={item.cta} sx={{ bgcolor: tokens.neutral[0], color: tokens.neutral[900], "&:hover": { bgcolor: tokens.neutral[100] } }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Numbered steps, each with a photo. */
export function StepsSection({ section }: { section: SectionOf<"steps"> }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 8, md: 8 }, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `repeat(${Math.min(section.items.length, 4)}, minmax(0, 1fr))` } }}>
        {section.items.map((item, index) => (
          <Box component="li" key={index}>
            <Reveal delay={index * 90}>
              <Box sx={{ position: "relative", mb: 5 }}>
                {item.image ? <Picture image={item.image} alt="" sizes="(min-width: 900px) 380px, 100vw" ratio="4 / 3" radius="lg" /> : <Box sx={{ height: 24 }} />}
                <Box
                  aria-hidden
                  sx={{
                    position: item.image ? "absolute" : "static",
                    left: 16,
                    bottom: -20,
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: tokens.accent[600],
                    color: tokens.neutral[0],
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    boxShadow: `0 0 0 4px ${tone.bg}`,
                  }}
                >
                  {index + 1}
                </Box>
              </Box>
              <Typography variant="h3" component="h3" sx={{ mt: 8, color: tone.fg }}>
                {text(item.title)}
              </Typography>
              <Typography sx={{ mt: 2, color: tone.muted }}>{text(item.body)}</Typography>
            </Reveal>
          </Box>
        ))}
      </Box>
    </SectionShell>
  );
}

/** Big numbers with icons. */
export function StatsSection({ section }: { section: SectionOf<"stats"> }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const columns = section.items.length <= 4 ? section.items.length : 3;
  return (
    <SectionShell section={section} labelled={Boolean(text(section.title))} sx={{ py: { xs: 10, md: 14 } }}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` } }}>
        {section.items.map((item, index) => (
          <Box component="li" key={index}>
            <Reveal delay={index * 70} sx={{ height: "100%" }}>
              <Box sx={{ height: "100%", textAlign: "center", p: { xs: 4, md: 6 }, borderRadius: `${tokens.radius.lg}px`, border: `1px solid ${tone.border}`, bgcolor: tone.card }}>
                <Box
                  aria-hidden
                  sx={{ width: 52, height: 52, mx: "auto", mb: 3, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: tone.inverse ? "rgba(255,255,255,0.1)" : tokens.accent[50], color: tone.inverse ? tokens.accent[200] : tokens.accent[600] }}
                >
                  <FeatureIconView icon={item.icon} />
                </Box>
                <Typography component="p" sx={{ m: 0, typography: "h2", fontWeight: 700, fontSize: { xs: "1.375rem", md: "1.875rem" }, color: tone.fg, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {text(item.value)}
                </Typography>
                <Typography variant="body2" component="p" sx={{ m: 0, mt: 1, color: tone.muted }}>
                  {text(item.label)}
                </Typography>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </SectionShell>
  );
}

/** Reasons to book, with icons; a photo beside them when there is one. */
export function FeaturesSection({ section }: { section: SectionOf<"features"> }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const image = section.image;

  const list = (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 6, md: 8 }, columnGap: 8, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: image ? "1fr 1fr" : "repeat(3, 1fr)" } }}>
      {section.items.map((item, index) => (
        <Box component="li" key={index}>
          <Reveal delay={(index % 3) * 70}>
            <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
              <Box
                aria-hidden
                sx={{ flexShrink: 0, width: 48, height: 48, borderRadius: `${tokens.radius.md}px`, display: "grid", placeItems: "center", bgcolor: tone.inverse ? "rgba(255,255,255,0.1)" : tokens.accent[50], color: tone.inverse ? tokens.accent[200] : tokens.accent[700] }}
              >
                <FeatureIconView icon={item.icon} />
              </Box>
              <Box>
                <Typography variant="h3" component="h3" sx={{ color: tone.fg, fontSize: "1.0625rem" }}>
                  {text(item.title)}
                </Typography>
                {text(item.body) && <Typography sx={{ mt: 1.5, color: tone.muted }}>{text(item.body)}</Typography>}
              </Box>
            </Box>
          </Reveal>
        </Box>
      ))}
    </Box>
  );

  return (
    <SectionShell section={section}>
      {image ? (
        <Box sx={{ display: "grid", gap: { xs: 10, md: 16 }, alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 5fr) minmax(0, 7fr)" } }}>
          <Box sx={{ position: "relative", display: { xs: "none", md: "block" } }}>
            <Box aria-hidden sx={{ position: "absolute", top: -20, left: -20, width: "60%", height: "60%", borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.accent[100] }} />
            <Picture image={image} alt="" sizes={460} ratio="4 / 5" radius="lg" sx={{ position: "relative", boxShadow: tokens.elevation.e2 }} />
          </Box>
          <Box>
            <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
            {list}
          </Box>
        </Box>
      ) : (
        <>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
          {list}
        </>
      )}
    </SectionShell>
  );
}

interface Quote {
  name: string;
  place: string;
  rating: number;
  quote: string;
  photo: SectionOf<"testimonials">["items"][number]["photo"];
}

/** Real reviews (and any the admin writes). Hidden until there is at least one. */
export function TestimonialsSection({ section }: { section: SectionOf<"testimonials"> }) {
  const { t, i18n } = useTranslation("public");
  const text = useText();
  const tone = useTone(section.tone);
  const wantsReviews = section.source !== "written";
  const reviews = useQuery({ ...reviewsQuery, enabled: wantsReviews }).data ?? [];
  const pick = (value: Localized) => (i18n.language === "hi" && value.hi ? value.hi : value.en);

  const quotes: Quote[] = [
    ...(section.source !== "reviews" ? section.items.map((item) => ({ name: item.name, place: text(item.place), rating: item.rating, quote: text(item.quote), photo: item.photo })) : []),
    ...(wantsReviews ? reviews.map((review) => ({ name: review.name, place: pick(review.service), rating: review.rating, quote: review.comment, photo: null })) : []),
  ];
  if (quotes.length === 0) return null;

  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      <Carousel label={text(section.title) || t("site.reviews")} columns={{ xs: 1.1, sm: 1.8, md: 3, lg: 3 }} inverse={tone.inverse}>
        {quotes.map((quote, index) => (
          <QuoteCard key={index} quote={quote} />
        ))}
      </Carousel>
    </SectionShell>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const initials = quote.name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Box component="figure" sx={{ m: 0, height: "100%", display: "flex", flexDirection: "column", p: { xs: 5, md: 6 }, borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, color: tokens.neutral[900] }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box role="img" aria-label={t("site.rating", { rating: quote.rating })} sx={{ display: "flex", color: tokens.accent[500] }}>
          {Array.from({ length: 5 }, (_, star) => (
            <StarRounded key={star} fontSize="small" sx={{ opacity: star < quote.rating ? 1 : 0.25 }} />
          ))}
        </Box>
        <FormatQuoteRounded aria-hidden sx={{ color: tokens.accent[200], fontSize: 36 }} />
      </Box>
      <Typography component="blockquote" sx={{ m: 0, mt: 3, flex: 1, color: tokens.neutral[800] }}>
        {quote.quote}
      </Typography>
      <Box component="figcaption" sx={{ mt: 5, display: "flex", alignItems: "center", gap: 3 }}>
        {quote.photo ? (
          <Picture image={quote.photo} alt="" sizes={44} ratio="1 / 1" radius="lg" sx={{ width: 44, flexShrink: 0, borderRadius: "50%" }} />
        ) : (
          <Box aria-hidden sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: tokens.accent[100], color: tokens.accent[800], fontWeight: 700 }}>
            {initials}
          </Box>
        )}
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{quote.name}</Typography>
          {quote.place && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {quote.place}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/** Questions as an accordion beside the heading. */
export function FaqSection({ section }: { section: SectionOf<"faq"> }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 6, md: 14 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 4fr) minmax(0, 8fr)" }, alignItems: "start" }}>
        <Box sx={{ position: { md: "sticky" }, top: { md: 100 } }}>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {section.showContact && (
            <Typography sx={{ mt: { xs: -4, md: -6 }, color: tone.muted }}>
              {t("home.faqMore")} <Link to="/contact">{t("home.faqContact")}</Link>
            </Typography>
          )}
        </Box>
        <Box sx={{ bgcolor: tone.card, borderRadius: `${tokens.radius.lg}px`, color: "text.primary" }}>
          <FaqList items={section.items.map((item) => ({ question: text(item.question), answer: text(item.answer) }))} />
        </Box>
      </Box>
    </SectionShell>
  );
}

/** A photo beside a block of text. */
export function ImageTextSection({ section }: { section: SectionOf<"imageText"> }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const imageFirst = section.imageSide === "left";
  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 8, md: 16 }, alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: section.image ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)" } }}>
        {section.image && (
          <Reveal sx={{ order: { xs: 0, md: imageFirst ? 0 : 1 } }}>
            <Picture image={section.image} alt="" sizes="(min-width: 900px) 560px, 100vw" ratio="5 / 4" radius="lg" sx={{ boxShadow: tokens.elevation.e2 }} />
          </Reveal>
        )}
        <Box sx={{ maxWidth: 620 }}>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {text(section.body) && (
            <Box sx={{ mt: { xs: -4, md: -6 } }}>
              <Markdown text={text(section.body)} inverse={tone.inverse} />
            </Box>
          )}
          {section.cta.href && (
            <Box sx={{ mt: 8 }}>
              <CtaButton cta={section.cta} inverse={tone.inverse} />
            </Box>
          )}
        </Box>
      </Box>
    </SectionShell>
  );
}

/** Free text: policies, long descriptions. */
export function RichTextSection({ section }: { section: SectionOf<"richText"> }) {
  const tone = useTone(section.tone);
  const text = useText();
  const title = text(section.title);
  return (
    <SectionShell section={section} labelled={Boolean(title)} width={section.width === "reading" ? "reading" : "marketing"} sx={{ py: { xs: 10, md: 14 } }}>
      {title && (
        <Typography id={titleId(section)} variant="h2" sx={{ mb: 6, color: tone.fg }}>
          {title}
        </Typography>
      )}
      <Markdown text={text(section.body)} inverse={tone.inverse} />
    </SectionShell>
  );
}

/** Photos in a mosaic. */
export function GallerySection({ section }: { section: SectionOf<"gallery"> }) {
  const tone = useTone(section.tone);
  const text = useText();
  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${section.items.length % 4 === 0 ? 4 : 3}, minmax(0, 1fr))` } }}>
        {section.items.map((item, index) => (
          <Box component="li" key={index}>
            <Reveal delay={(index % 4) * 60}>
              <Box component="figure" sx={{ m: 0 }}>
                <Picture image={item.image} alt={text(item.caption)} sizes="(min-width: 900px) 300px, 45vw" ratio={index % 3 === 1 ? "4 / 5" : "1 / 1"} radius="lg" />
                {text(item.caption) && (
                  <Typography variant="body2" component="figcaption" sx={{ mt: 2, color: tone.muted }}>
                    {text(item.caption)}
                  </Typography>
                )}
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </SectionShell>
  );
}

/** A YouTube video (loaded only when played) or a video file. */
export function VideoSection({ section }: { section: SectionOf<"video"> }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const text = useText();
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(section.youtube);
  const title = text(section.title) || t("site.video");
  const frame = { position: "relative", aspectRatio: "16 / 9", borderRadius: `${tokens.radius.lg}px`, overflow: "hidden", bgcolor: tokens.neutral[900], maxWidth: 980, mx: "auto", boxShadow: tokens.elevation.e2 } as const;

  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      {id ? (
        <Box sx={frame}>
          {playing ? (
            <Box
              component="iframe"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <Box component="button" type="button" onClick={() => setPlaying(true)} aria-label={t("site.playVideo", { title })} sx={{ position: "absolute", inset: 0, p: 0, border: 0, cursor: "pointer", bgcolor: "transparent", "&:focus-visible": { outline: `3px solid ${tokens.accent[500]}`, outlineOffset: -3 } }}>
              {section.poster ? (
                <Picture image={section.poster} alt="" sizes={980} ratio="16 / 9" radius="lg" sx={{ borderRadius: 0 }} />
              ) : (
                <Box component="img" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
              <Box aria-hidden sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.25)" }}>
                <Box sx={{ width: 76, height: 76, borderRadius: "50%", bgcolor: tokens.accent[600], color: tokens.neutral[0], display: "grid", placeItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
                  <PlayArrowRounded sx={{ fontSize: 44 }} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={frame}>
          <Box component="video" src={videoSrc(section.file)} controls preload="metadata" poster={section.poster ? imageSrc(section.poster, 960) : undefined} title={title} sx={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
        </Box>
      )}
    </SectionShell>
  );
}

/** A closing call to action, over a photo or the brand colour. */
export function CtaSection({ section }: { section: SectionOf<"cta"> }) {
  const { tokens } = useTheme();
  const text = useText();
  const background = section.tone === "dark" || section.image ? tokens.neutral[900] : tokens.accent[700];
  return (
    <SectionShell section={{ ...section, tone: section.tone === "dark" ? "plain" : section.tone }} sx={{ py: { xs: 10, md: 14 } }}>
      <Box sx={{ position: "relative", overflow: "hidden", borderRadius: `${tokens.radius.lg}px`, bgcolor: background, color: tokens.neutral[0], px: { xs: 6, md: 14 }, py: { xs: 10, md: 14 } }}>
        {section.image && (
          <>
            <Picture image={section.image} alt="" sizes={1200} ratio="auto" radius="lg" sx={{ position: "absolute", inset: 0, height: "100%", borderRadius: 0 }} />
            <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(20,16,12,0.9) 0%, rgba(20,16,12,0.7) 55%, rgba(20,16,12,0.35) 100%)" }} />
          </>
        )}
        <Box sx={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Box sx={{ maxWidth: 620 }}>
            {text(section.eyebrow) && (
              <Typography variant="label" component="p" sx={{ m: 0, mb: 2, color: tokens.accent[200], textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {text(section.eyebrow)}
              </Typography>
            )}
            <Typography id={titleId(section)} variant="h2" sx={{ color: tokens.neutral[0], fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
              {text(section.title)}
            </Typography>
            {text(section.subtitle) && (
              <Typography variant="bodyLg" component="p" sx={{ mt: 3, color: "rgba(255,255,255,0.88)" }}>
                {text(section.subtitle)}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <CtaButton cta={section.primary} size="lg" sx={{ bgcolor: tokens.neutral[0], color: tokens.accent[800], "&:hover": { bgcolor: tokens.accent[50] } }} />
            <CtaButton cta={section.secondary} size="lg" variant="secondary" inverse />
          </Box>
        </Box>
      </Box>
    </SectionShell>
  );
}

/** App store links; hidden until Brand & theme has at least one. */
export function AppDownloadSection({ section }: { section: SectionOf<"appDownload"> }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const { apps } = useSite().site;
  if (!apps.android && !apps.ios) return null;
  const store = { justifyContent: "flex-start", px: 5, py: 2, borderRadius: `${tokens.radius.md}px`, bgcolor: tokens.neutral[900], color: tokens.neutral[0], "&:hover": { bgcolor: tokens.neutral[800] } } as const;
  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 8, md: 14 }, alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: section.image ? "minmax(0, 5fr) minmax(0, 7fr)" : "minmax(0, 1fr)" } }}>
        {section.image && <Picture image={section.image} alt="" sizes="(min-width: 900px) 460px, 100vw" ratio="4 / 5" radius="lg" />}
        <Box>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {apps.android && (
              <Button href={apps.android} target="_blank" rel="noopener noreferrer" size="lg" startIcon={<AndroidOutlined />} sx={store}>
                {t("site.googlePlay")}
              </Button>
            )}
            {apps.ios && (
              <Button href={apps.ios} target="_blank" rel="noopener noreferrer" size="lg" startIcon={<Apple />} sx={store}>
                {t("site.appStore")}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </SectionShell>
  );
}

/** Where we serve: localities as chips beside a description (good for search engines). */
export function AreasSection({ section }: { section: SectionOf<"areas"> }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const served = useSite().areas;
  const names = [...section.items.map((item) => text(item)), ...(section.showServed ? served : [])].filter((name, index, all) => name && all.indexOf(name) === index);
  const body = text(section.body);

  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 8, md: 14 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: body ? "minmax(0, 7fr) minmax(0, 5fr)" : "minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {body && (
            <Box sx={{ mt: { xs: -4, md: -6 } }}>
              <Markdown text={body} inverse={tone.inverse} />
            </Box>
          )}
        </Box>
        {names.length > 0 && (
          <Box sx={{ p: { xs: 5, md: 6 }, borderRadius: `${tokens.radius.lg}px`, border: `1px solid ${tone.border}`, bgcolor: tone.card }}>
            <Typography variant="h3" component="h3" sx={{ mb: 4, color: tone.fg }}>
              {t("site.areasTitle")}
            </Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 2 }}>
              {names.map((name) => (
                <Box
                  component="li"
                  key={name}
                  sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 3, py: 1.5, borderRadius: 999, bgcolor: tone.inverse ? "rgba(255,255,255,0.08)" : tokens.accent[50], color: tone.inverse ? tokens.neutral[0] : tokens.accent[800], typography: "body2", fontWeight: 500 }}
                >
                  <PlaceOutlined sx={{ fontSize: 16 }} aria-hidden />
                  {name}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </SectionShell>
  );
}

/** Invites professionals to join, with a photo and a short checklist. */
export function JoinProsSection({ section }: { section: SectionOf<"joinPros"> }) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 8, md: 16 }, alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: section.image ? "minmax(0, 7fr) minmax(0, 5fr)" : "minmax(0, 1fr)" } }}>
        <Box>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {section.points.length > 0 && (
            <Box component="ul" sx={{ listStyle: "none", m: 0, mt: { xs: -2, md: -4 }, p: 0, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {section.points.map((point, index) => (
                <Box component="li" key={index} sx={{ display: "flex", gap: 2, alignItems: "flex-start", color: tone.fg }}>
                  <CheckCircleRounded aria-hidden sx={{ color: tokens.accent[600], mt: 0.25 }} />
                  <Typography sx={{ fontWeight: 500 }}>{text(point)}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {section.cta.href && (
            <Box sx={{ mt: 8 }}>
              <CtaButton cta={section.cta} size="lg" />
            </Box>
          )}
        </Box>
        {section.image && (
          <Box sx={{ position: "relative", maxWidth: 440, justifySelf: { md: "end" }, width: "100%" }}>
            <Box aria-hidden sx={{ position: "absolute", inset: "24px -16px -16px 24px", borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.accent[200] }} />
            <Picture image={section.image} alt="" sizes="(min-width: 900px) 440px, 100vw" ratio="4 / 5" radius="lg" sx={{ position: "relative" }} />
          </Box>
        )}
      </Box>
    </SectionShell>
  );
}
