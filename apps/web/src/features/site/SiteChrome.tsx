import type { ReactNode } from "react";
import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import AndroidOutlined from "@mui/icons-material/AndroidOutlined";
import Apple from "@mui/icons-material/Apple";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import Facebook from "@mui/icons-material/Facebook";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Instagram from "@mui/icons-material/Instagram";
import LinkedIn from "@mui/icons-material/LinkedIn";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import WhatsApp from "@mui/icons-material/WhatsApp";
import X from "@mui/icons-material/X";
import YouTube from "@mui/icons-material/YouTube";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import { BOTTOM_NAV_HEIGHT, Link, Wordmark } from "@/design-system";
import { useSite } from "./api";
import { LocationChip } from "./location";
import { telHref, useText, whatsappHref } from "./text";

/** The logo as set in Brand & theme. */
export function SiteLogo({ size = "md", inverse = false }: { size?: "sm" | "md"; inverse?: boolean }) {
  const { site } = useSite();
  const text = useText();
  return <Wordmark size={size} name={text(site.brand.name)} logo={site.brand.logo} showName={site.brand.showName} inverse={inverse} />;
}

const isInternal = (href: string) => href.startsWith("/") || href.startsWith("#");

/** A link from the admin's menus: routed inside the site, opened normally elsewhere. */
function SiteLink({ href, children, sx }: { href: string; children: ReactNode; sx?: object }) {
  return isInternal(href) ? (
    <Link to={href} standalone sx={sx}>
      {children}
    </Link>
  ) : (
    <Link href={href} standalone sx={sx}>
      {children}
    </Link>
  );
}

/**
 * The thin dark bar above the header: the visitor's location on the left (from md; phones
 * have it under the header), the announcement from Brand & theme → Header, and the phone.
 */
export function TopBar() {
  const { tokens } = useTheme();
  const { site } = useSite();
  const text = useText();
  const { announcement } = site.header;
  const message = announcement.enabled ? text(announcement.text) : "";
  const phone = site.brand.supportPhone;
  const content = (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, maxWidth: "100%", minWidth: 0 }}>
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {message}
      </Box>
      {announcement.href && <ArrowForwardOutlined sx={{ fontSize: 16, flexShrink: 0 }} aria-hidden />}
    </Box>
  );
  return (
    <Box sx={{ display: { xs: message ? "block" : "none", md: "block" }, bgcolor: tokens.neutral[900], color: tokens.neutral[0], typography: "caption", fontSize: { xs: "0.75rem", md: "0.8125rem" }, fontWeight: 500 }}>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, minHeight: { xs: 32, md: 40 }, display: "flex", alignItems: "center", gap: 4 }}>
        <Box sx={{ display: { xs: "none", md: "block" }, flex: "0 0 auto" }}>
          <LocationChip inverse compact />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
          {message &&
            (announcement.href ? (
              <SiteLink href={announcement.href} sx={{ color: tokens.neutral[0], maxWidth: "100%", minWidth: 0, "&:hover": { color: tokens.accent[200] } }}>
                {content}
              </SiteLink>
            ) : (
              content
            ))}
        </Box>
        {phone && (
          <Link href={telHref(phone)} standalone sx={{ display: { xs: "none", md: "inline-flex" }, alignItems: "center", gap: 1, color: tokens.neutral[0], whiteSpace: "nowrap", "&:hover": { color: tokens.accent[200] } }}>
            <PhoneOutlined sx={{ fontSize: 16 }} aria-hidden />
            {phone}
          </Link>
        )}
      </Container>
    </Box>
  );
}

/** The footer from Brand & theme: about text, contacts, social links, the admin's columns, legal line. */
export function SiteFooter() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const { site } = useSite();
  const text = useText();
  const year = new Date().getFullYear();
  const brand = site.brand;
  const muted = "rgba(255,255,255,0.72)";
  const social = [
    { href: site.social.instagram, label: "Instagram", icon: <Instagram /> },
    { href: site.social.facebook, label: "Facebook", icon: <Facebook /> },
    { href: site.social.youtube, label: "YouTube", icon: <YouTube /> },
    { href: site.social.x, label: "X", icon: <X /> },
    { href: site.social.linkedin, label: "LinkedIn", icon: <LinkedIn /> },
  ].filter((item) => item.href);
  const whatsapp = whatsappHref(brand.whatsapp);
  type Contact = { href: string; label: string; icon: ReactNode };
  const contacts = ([
    brand.supportPhone && { href: telHref(brand.supportPhone), label: brand.supportPhone, icon: <PhoneOutlined fontSize="small" /> },
    whatsapp && { href: whatsapp, label: t("site.chatOnWhatsapp"), icon: <WhatsApp fontSize="small" /> },
    brand.supportEmail && { href: `mailto:${brand.supportEmail}`, label: brand.supportEmail, icon: <EmailOutlined fontSize="small" /> },
  ] as Array<Contact | false | "">).filter((item): item is Contact => Boolean(item));
  const legal = [brand.legalName, brand.gstin && `GSTIN ${brand.gstin}`].filter(Boolean).join(" · ");
  const linkStyle = { color: muted, typography: "body2", "&:hover": { color: tokens.neutral[0] }, "@media (pointer: coarse)": { display: "inline-flex", alignItems: "center", minHeight: tokens.touchTarget.default } };

  return (
    <Box component="footer" sx={{ bgcolor: tokens.neutral[900], color: tokens.neutral[0], mt: 0 }}>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, pt: { xs: 12, md: 16 }, pb: { xs: 8, md: 10 } }}>
        <Box sx={{ display: "grid", gap: { xs: 10, md: 8 }, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `minmax(0, 1.6fr) repeat(${Math.max(1, site.footer.columns.length)}, minmax(0, 1fr))` } }}>
          <Box sx={{ gridColumn: { sm: "1 / -1", md: "auto" }, maxWidth: 380 }}>
            <SiteLogo size="sm" inverse />
            {text(site.footer.about) && (
              <Typography variant="body2" sx={{ mt: 4, color: muted }}>
                {text(site.footer.about)}
              </Typography>
            )}
            {contacts.length > 0 && (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 5, display: "grid", gap: 2 }}>
                {contacts.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} standalone sx={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 2, wordBreak: "break-word" }}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </Box>
            )}
            {social.length > 0 && (
              <Box component="ul" aria-label={t("site.followUs")} sx={{ listStyle: "none", m: 0, p: 0, mt: 6, display: "flex", gap: 2 }}>
                {social.map((item) => (
                  <li key={item.label}>
                    <ButtonBase
                      component="a"
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.08)", color: tokens.neutral[0], "&:hover": { bgcolor: tokens.accent[600] }, "&:focus-visible": { outline: `2px solid ${tokens.accent[200]}`, outlineOffset: 2 } }}
                    >
                      {item.icon}
                    </ButtonBase>
                  </li>
                ))}
              </Box>
            )}
          </Box>
          {site.footer.columns.map((column, index) => (
            <Box key={index} component="nav" aria-label={text(column.title)}>
              <Typography variant="label" component="h2" sx={{ m: 0, mb: 4, color: tokens.neutral[0], textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.75rem" }}>
                {text(column.title)}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2.5, "@media (pointer: coarse)": { gap: 0 } }}>
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <SiteLink href={link.href} sx={linkStyle}>
                      {text(link.label)}
                    </SiteLink>
                  </li>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {(site.apps.android || site.apps.ios) && (
          <Box sx={{ mt: 10, display: "flex", gap: 3, flexWrap: "wrap" }}>
            {site.apps.android && (
              <Link href={site.apps.android} standalone sx={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 2, px: 4, py: 2, borderRadius: `${tokens.radius.md}px`, border: "1px solid rgba(255,255,255,0.24)" }}>
                <AndroidOutlined fontSize="small" />
                {t("site.googlePlay")}
              </Link>
            )}
            {site.apps.ios && (
              <Link href={site.apps.ios} standalone sx={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 2, px: 4, py: 2, borderRadius: `${tokens.radius.md}px`, border: "1px solid rgba(255,255,255,0.24)" }}>
                <Apple fontSize="small" />
                {t("site.appStore")}
              </Link>
            )}
          </Box>
        )}

        <Box sx={{ mt: { xs: 10, md: 12 }, pt: 6, borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", flexWrap: "wrap", gap: 2, columnGap: 6, justifyContent: "space-between", color: muted, typography: "caption", fontSize: "0.8125rem" }}>
          <span>
            © {year} {text(brand.name)}
            {legal ? ` · ${legal}` : ""}
          </span>
          {text(site.footer.bottomText) && <span>{text(site.footer.bottomText)}</span>}
        </Box>
      </Container>
    </Box>
  );
}

/** The phone tab bar (like the salon apps): Home, Services, Bookings, Account. */
export function BottomNav({ bookingsTo, accountTo }: { bookingsTo: string; accountTo: string }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const { pathname } = useLocation();
  const items = [
    { to: "/", label: t("site.tabHome"), icon: <HomeOutlined />, current: pathname === "/" },
    { to: "/services", label: t("site.tabServices"), icon: <SpaOutlined />, current: pathname.startsWith("/services") },
    { to: bookingsTo, label: t("site.tabBookings"), icon: <EventNoteOutlined />, current: pathname.startsWith("/account/bookings") || pathname.startsWith("/bookings") },
    { to: accountTo, label: t("site.tabAccount"), icon: <AccountCircleOutlined />, current: pathname === "/account" || pathname.startsWith("/account/addresses") },
  ];

  return (
    <Box
      component="nav"
      data-bottom-nav
      aria-label={t("site.tabs")}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: tokens.layer.actionBar,
        bgcolor: tokens.neutral[0],
        borderTop: `1px solid ${tokens.neutral[200]}`,
        boxShadow: "0 -6px 20px rgba(31,28,25,0.06)",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: BOTTOM_NAV_HEIGHT }}>
        {items.map((item) => (
          <li key={item.label}>
            <ButtonBase
              component={RouterLink}
              to={item.to}
              aria-current={item.current ? "page" : undefined}
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                color: item.current ? tokens.accent[700] : tokens.neutral[600],
                typography: "caption",
                fontWeight: item.current ? 600 : 500,
                "& svg": { fontSize: 24 },
                "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: -4 },
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          </li>
        ))}
      </Box>
    </Box>
  );
}
