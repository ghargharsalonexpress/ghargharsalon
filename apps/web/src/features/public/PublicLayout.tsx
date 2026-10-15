import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { homeFor, useCurrentUser } from "@/app/session";
import { type NavItem, PublicShell } from "@/design-system";
import { cartCount, useCart } from "@/features/cart/cartStore";
import { useSite } from "@/features/site/api";
import { LocationChip, LocationProvider, NotServedBanner } from "@/features/site/location";
import { BottomNav, SiteFooter, SiteLogo, TopBar } from "@/features/site/SiteChrome";
import { useText } from "@/features/site/text";

/** Header, drawer, footer and the phones' tab bar around every public page (plan A7, ADR-0021). */
export function PublicLayout() {
  const { t } = useTranslation("public");
  const { pathname, search } = useLocation();
  const user = useCurrentUser();
  const count = useCart((state) => cartCount(state.lines));
  const { site } = useSite();
  const text = useText();

  // The menu comes from Admin → Website → Navigation.
  const nav: NavItem[] = site.header.menu.map((item, index) => ({ id: `menu-${index}`, label: text(item.label), to: item.href, emphasis: item.emphasis }));

  // Logging in from a page brings the visitor back to it (plan W2).
  const here = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  const account = user ? { label: t("nav.account"), to: user.role === "customer" ? "/account/bookings" : homeFor(user) } : { label: t("nav.login"), to: `/login${here}` };
  const customer = !user || user.role === "customer";
  const tabs = user ? { bookings: user.role === "customer" ? "/account/bookings" : homeFor(user), account: user.role === "customer" ? "/account" : homeFor(user) } : { bookings: "/login?next=%2Faccount%2Fbookings", account: "/login?next=%2Faccount" };

  return (
    <LocationProvider>
      {/* Professionals don't book (plan A7 permissions), so they get no cart. */}
      <PublicShell
        nav={nav}
        showCart={user?.role !== "professional"}
        cartCount={count}
        accountLabel={account.label}
        accountTo={account.to}
        logo={<SiteLogo />}
        topBar={<TopBar />}
        subHeader={<LocationChip fullWidth />}
        banner={<NotServedBanner />}
        footer={<SiteFooter />}
        bottomNav={customer ? <BottomNav bookingsTo={tabs.bookings} accountTo={tabs.account} /> : undefined}
      >
        <Outlet />
      </PublicShell>
    </LocationProvider>
  );
}
