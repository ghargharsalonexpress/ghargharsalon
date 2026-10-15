import { AuthShell, type AuthShellProps } from "@/design-system";
import { useSite } from "./api";
import { SiteLogo } from "./SiteChrome";
import { useText } from "./text";

/** The login and password pages with the website's logo, login photo and tagline (ADR-0021). */
export function SiteAuthShell(props: Omit<AuthShellProps, "photo" | "caption" | "logo">) {
  const { site } = useSite();
  const text = useText();
  return <AuthShell {...props} logo={<SiteLogo size="sm" />} photo={site.photos.login} caption={text(site.brand.tagline)} />;
}
