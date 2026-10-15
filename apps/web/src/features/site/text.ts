import { createContext, useCallback, useContext, useMemo } from "react";
import { fillVariables, type Localized, pick, type TextVariable } from "@brand/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { catalogQuery } from "@/features/catalog/api";
import { clockText, useInfo } from "@/features/public/info";
import { formatDate, formatMoney } from "@/lib/format";
import { useSite } from "./api";

type Variables = Partial<Record<TextVariable, string | number>>;

/** Values a page adds for its own texts ({{updated}}: when it was last published). */
export const PageVariablesContext = createContext<Variables>({});

/** Telephone link for a displayed number ("+91 70650 94179" → "tel:+917065094179"). */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** wa.me link for a WhatsApp number, or "" when there is none. */
export const whatsappHref = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

/**
 * Everything a {{variable}} can stand for (ADR-0021): brand and contact details from the
 * site configuration, hours and fees from the live settings, the catalogue's size. Legal
 * details the admin hasn't filled yet read naturally instead of showing a placeholder.
 */
export function useTextVariables(): Variables {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const { site } = useSite();
  const info = useInfo();
  const catalog = useQuery(catalogQuery).data;
  const page = useContext(PageVariablesContext);
  const brand = site.brand;

  return useMemo(() => {
    const name = pick(brand.name, lang);
    const support = [brand.supportEmail, brand.supportPhone].filter(Boolean).join(" · ");
    const services = catalog?.services.length ?? 0;
    return {
      brand: name,
      phone: brand.supportPhone,
      email: brand.supportEmail,
      whatsapp: brand.whatsapp,
      support,
      company: brand.legalName || name,
      address: pick(brand.address, lang) || t("site.fallback.address"),
      gstin: brand.gstin,
      grievance: brand.grievanceOfficer || t("site.fallback.grievance"),
      city: brand.jurisdiction || t("site.fallback.city"),
      min: brand.promiseMin,
      max: brand.promiseMax,
      open: clockText(info.serviceHours.open, lang),
      close: clockText(info.serviceHours.close, lang),
      cancelFee: formatMoney(info.fees.cancelAfterAcceptPaise, lang),
      noShowFee: formatMoney(info.fees.noShowPaise, lang),
      lateMinutes: info.lateThresholdMinutes,
      waitMinutes: info.noShowWaitMinutes,
      searchMinutes: Math.max(1, Math.round(info.searchTimeoutSeconds / 60)),
      searchTime: t("common:time.minutes", { count: Math.max(1, Math.round(info.searchTimeoutSeconds / 60)) }),
      // "190+" reads better than "194+", and stays true as services are added.
      services: services >= 20 ? Math.floor(services / 10) * 10 : services || "",
      updated: formatDate(new Date(), lang),
      ...page,
    };
  }, [brand, lang, t, info, catalog, page]);
}

/** Turns stored text into what the visitor reads: their language, variables filled in. */
export function useText(): (text: Localized | undefined) => string {
  const { i18n } = useTranslation();
  const variables = useTextVariables();
  const lang = i18n.language;
  return useCallback((text: Localized | undefined) => fillVariables(pick(text, lang), variables), [lang, variables]);
}
