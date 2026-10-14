import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { homeFor, useCurrentUser } from "@/app/session";
import { type NavItem, PublicShell } from "@/design-system";
import { cartCount, useCart } from "@/features/cart/cartStore";

/** Header, drawer and footer around every public page (plan A7). */
export function PublicLayout() {
  const { t } = useTranslation("public");
  const { pathname, search } = useLocation();
  const user = useCurrentUser();
  const count = useCart((state) => cartCount(state.lines));

  const nav: NavItem[] = [
    { id: "services", label: t("nav.services"), to: "/services" },
    { id: "how", label: t("nav.howItWorks"), to: "/#how-it-works" },
    { id: "about", label: t("nav.about"), to: "/about" },
    { id: "contact", label: t("nav.contact"), to: "/contact" },
    // Professionals are a second audience, so their way in sits in the header, not the footer.
    { id: "join", label: t("nav.joinPro"), to: "/register-as-professional", emphasis: true },
  ];

  // Logging in from a page brings the visitor back to it (plan W2).
  const here = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  const account = user ? { label: t("nav.account"), to: user.role === "customer" ? "/account/bookings" : homeFor(user) } : { label: t("nav.login"), to: `/login${here}` };

  return (
    // Professionals don't book (plan A7 permissions), so they get no cart.
    <PublicShell nav={nav} showCart={user?.role !== "professional"} cartCount={count} accountLabel={account.label} accountTo={account.to}>
      <Outlet />
    </PublicShell>
  );
}
