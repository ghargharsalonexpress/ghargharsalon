import type { Section } from "@brand/shared";
import { CategoriesSection, ServicesSection } from "./sections/CatalogSections";
import {
  AppDownloadSection,
  AreasSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  GallerySection,
  ImageTextSection,
  JoinProsSection,
  OffersSection,
  PageHeaderSection,
  RichTextSection,
  StatsSection,
  StepsSection,
  TestimonialsSection,
  VideoSection,
} from "./sections/ContentSections";
import { ContactFormSection, ProApplicationSection } from "./sections/FormSections";
import { HeroSection } from "./sections/HeroSection";

/** One section of a page, by its type (ADR-0021). `first` gets the page's h1 and loads its photo eagerly. */
export function SectionRenderer({ section, first }: { section: Section; first: boolean }) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} first={first} />;
    case "pageHeader":
      return <PageHeaderSection section={section} first={first} />;
    case "categories":
      return <CategoriesSection section={section} />;
    case "services":
      return <ServicesSection section={section} />;
    case "offers":
      return <OffersSection section={section} />;
    case "steps":
      return <StepsSection section={section} />;
    case "stats":
      return <StatsSection section={section} />;
    case "features":
      return <FeaturesSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "faq":
      return <FaqSection section={section} />;
    case "imageText":
      return <ImageTextSection section={section} />;
    case "richText":
      return <RichTextSection section={section} />;
    case "gallery":
      return <GallerySection section={section} />;
    case "video":
      return <VideoSection section={section} />;
    case "cta":
      return <CtaSection section={section} />;
    case "appDownload":
      return <AppDownloadSection section={section} />;
    case "areas":
      return <AreasSection section={section} />;
    case "contactForm":
      return <ContactFormSection section={section} />;
    case "proApplication":
      return <ProApplicationSection section={section} />;
    case "joinPros":
      return <JoinProsSection section={section} />;
  }
}
