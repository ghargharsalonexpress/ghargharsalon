import type { PublicPageDto } from "@brand/shared";
import { usePageMeta } from "@/features/public/usePageMeta";
import { imageSrc } from "@/lib/media";
import { useSite } from "./api";
import { telHref, useText } from "./text";

const absolute = (url: string) => (url.startsWith("http") ? url : `${window.location.origin}${url}`);

/**
 * Search and link-preview tags for a website page (ADR-0021): its SEO title and description,
 * its photo, noindex, the business on the home page and its questions as FAQ data.
 */
export function PageMeta({ page }: { page: PublicPageDto }) {
  const text = useText();
  const { site } = useSite();
  const title = text(page.seo.title) || text(page.title);
  const description = text(page.seo.description) || undefined;
  const photo = page.seo.image ?? page.sections.flatMap((section) => (section.type === "hero" ? section.slides.map((slide) => slide.image) : section.type === "pageHeader" ? [section.image] : [])).find(Boolean) ?? null;

  const jsonLd: Array<Record<string, unknown>> = [];
  if (page.path === "/") {
    const sameAs = Object.values(site.social).filter(Boolean);
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BeautySalon",
      name: text(site.brand.name),
      url: window.location.origin,
      description: text(site.seo.description) || description,
      ...(site.brand.supportPhone ? { telephone: telHref(site.brand.supportPhone).slice(4) } : {}),
      ...(site.brand.supportEmail ? { email: site.brand.supportEmail } : {}),
      ...(text(site.brand.address) ? { address: text(site.brand.address) } : {}),
      ...(photo ? { image: absolute(imageSrc(photo, 1200)) } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    });
  }
  const questions = page.sections.flatMap((section) => (section.type === "faq" && section.visible ? section.items : []));
  if (questions.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((item) => ({ "@type": "Question", name: text(item.question), acceptedAnswer: { "@type": "Answer", text: text(item.answer) } })),
    });
  }

  usePageMeta(title, description, {
    image: photo ? absolute(imageSrc(photo, 1200)) : undefined,
    noindex: page.seo.noindex || page.draft === true,
    jsonLd,
  });
  return null;
}
