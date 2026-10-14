import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, redirect } from "react-router";
import { AppBoot } from "@/features/system/AppBoot";
import { NotFoundContent } from "@/features/system/NotFoundPage";
import { RouteError } from "@/features/system/RouteError";
import { loadNamespaces, type Namespace } from "@/i18n/namespaces";
import { queryClient } from "./queryClient";
import { Root } from "./Root";
import { guestOnly, homeFor, requireRole, sessionQuery } from "./session";

const SHOW_STYLEGUIDE = import.meta.env.DEV || import.meta.env.VITE_SHOW_STYLEGUIDE === "1";

/** Route chunk plus its strings, loaded together (plan C3: lazy chunks per area). */
const page =
  <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K, ...namespaces: Namespace[]) =>
  async () => {
    const [module] = await Promise.all([load(), loadNamespaces(...namespaces)]);
    return { Component: module[name] };
  };

/** Makes sure the CSRF token is ready for logged-out forms; a down API is handled by the form itself. */
const prefetchSession = async () => {
  await queryClient.ensureQueryData(sessionQuery).catch(() => null);
  return null;
};

/** Legacy /dashboard (plan A7): each role's own home. */
const dashboardRedirect = async () => {
  const { user } = await queryClient.ensureQueryData(sessionQuery);
  return redirect(user ? homeFor(user) : "/login");
};

/**
 * Routes (plan A7). Public pages share one layout (header, cart, footer); auth, pro and admin
 * have their own shells. /styleguide and /samples are excluded from production in Phase 9.
 */
export const router = createBrowserRouter([
  {
    // Pathless root: boot screen while the first lazy chunk loads, one error boundary for all routes.
    Component: Root,
    HydrateFallback: AppBoot,
    ErrorBoundary: RouteError,
    children: [
      // Public website (Phase 3)
      {
        lazy: page(() => import("@/features/public/PublicLayout"), "PublicLayout", "public"),
        children: [
          { index: true, lazy: page(() => import("@/features/public/HomePage"), "HomePage", "public") },
          {
            path: "services",
            lazy: page(() => import("@/features/public/ServicesPage"), "ServicesPage", "public"),
            children: [{ path: ":slug", lazy: page(() => import("@/features/public/ServiceSheet"), "ServiceSheet", "public") }],
          },
          { path: "cart", lazy: page(() => import("@/features/public/CartPage"), "CartPage", "public") },
          { path: "about", lazy: page(() => import("@/features/public/AboutPage"), "AboutPage", "public") },
          { path: "contact", loader: prefetchSession, lazy: page(() => import("@/features/public/ContactPage"), "ContactPage", "public") },
          { path: "legal/:doc", lazy: page(() => import("@/features/public/LegalPage"), "LegalPage", "public", "legal") },
          { path: "register-as-professional", lazy: page(() => import("@/features/public/JoinPage"), "JoinPage", "public") },

          // Customer: checkout, booking status, account (server-side authorisation is the real guard; this only routes people)
          { path: "checkout", loader: requireRole("customer"), lazy: page(() => import("@/features/booking/CheckoutPage"), "CheckoutPage", "public", "booking") },
          { path: "bookings/:id", loader: requireRole("customer"), lazy: page(() => import("@/features/booking/BookingPage"), "BookingPage", "booking") },
          {
            path: "account",
            loader: requireRole("customer"),
            lazy: page(() => import("@/features/account/AccountLayout"), "AccountLayout", "account", "booking"),
            children: [
              { index: true, lazy: page(() => import("@/features/account/ProfilePage"), "ProfilePage", "account") },
              { path: "bookings", lazy: page(() => import("@/features/account/MyBookingsPage"), "MyBookingsPage", "account", "booking") },
              { path: "addresses", lazy: page(() => import("@/features/account/AddressesPage"), "AddressesPage", "account", "booking") },
              { path: "profile", element: <Navigate to="/account" replace /> },
            ],
          },

          { path: "*", element: <NotFoundContent /> },
        ],
      },

      // Legacy URLs (plan A7)
      { path: "/all-services", element: <Navigate to="/services" replace /> },
      { path: "/about-us", element: <Navigate to="/about" replace /> },
      { path: "/book-service", element: <Navigate to="/checkout" replace /> },
      { path: "/dashboard", loader: dashboardRedirect },

      // Printable invoice (plan C9): no site header or footer around it.
      { path: "/bookings/:id/invoice", loader: requireRole("customer", "admin"), lazy: page(() => import("@/features/booking/InvoicePage"), "InvoicePage", "booking") },

      // Authentication (W2)
      { path: "/login", loader: guestOnly, lazy: page(() => import("@/features/auth/LoginPage"), "LoginPage", "auth") },
      { path: "/signup", loader: guestOnly, lazy: page(() => import("@/features/auth/SignupPage"), "SignupPage", "auth") },
      { path: "/forgot-password", loader: prefetchSession, lazy: page(() => import("@/features/auth/ForgotPasswordPage"), "ForgotPasswordPage", "auth") },
      { path: "/reset-password", loader: prefetchSession, lazy: page(() => import("@/features/auth/ResetPasswordPage"), "ResetPasswordPage", "auth") },

      // Role homes
      // Professional panel (Phase 4): its own installable app
      {
        path: "/pro",
        loader: requireRole("professional"),
        lazy: page(() => import("@/features/pro/ProLayout"), "ProLayout", "pro"),
        children: [
          { index: true, lazy: page(() => import("@/features/pro/ProHomePage"), "ProHomePage", "pro") },
          // Job alerts and jobs (Phases 6–7)
          { path: "offers/:id", lazy: page(() => import("@/features/pro/ProOfferPage"), "ProOfferPage", "pro") },
          { path: "jobs", lazy: page(() => import("@/features/pro/ProJobsPage"), "ProJobsPage", "pro") },
          { path: "jobs/:id", lazy: page(() => import("@/features/pro/ProJobPage"), "ProJobPage", "pro") },
          { path: "earnings", lazy: page(() => import("@/features/pro/ProEarningsPage"), "ProEarningsPage", "pro") },
          { path: "profile", lazy: page(() => import("@/features/pro/ProProfilePage"), "ProProfilePage", "pro") },
          { path: "*", element: <NotFoundContent /> },
        ],
      },
      {
        path: "/admin",
        loader: requireRole("admin"),
        lazy: page(() => import("@/features/admin/AdminLayout"), "AdminLayout", "admin"),
        children: [
          { index: true, lazy: page(() => import("@/features/admin/AdminHomePage"), "AdminHomePage", "admin") },
          // Catalogue (Phase 3, W13)
          { path: "services", lazy: page(() => import("@/features/admin/catalog/AdminServicesPage"), "AdminServicesPage", "admin") },
          { path: "services/new", lazy: page(() => import("@/features/admin/catalog/ServiceEditorPage"), "ServiceEditorPage", "admin") },
          { path: "services/:id/edit", lazy: page(() => import("@/features/admin/catalog/ServiceEditorPage"), "ServiceEditorPage", "admin") },
          { path: "categories", lazy: page(() => import("@/features/admin/catalog/AdminCategoriesPage"), "AdminCategoriesPage", "admin") },
          { path: "messages", lazy: page(() => import("@/features/admin/messages/AdminMessagesPage"), "AdminMessagesPage", "admin") },
          // Operations (Phase 8, W14–W16)
          { path: "live", lazy: page(() => import("@/features/admin/ops/LivePage"), "LivePage", "admin") },
          { path: "bookings", lazy: page(() => import("@/features/admin/ops/BookingsPage"), "BookingsPage", "admin") },
          { path: "bookings/:id", lazy: page(() => import("@/features/admin/ops/BookingDetailPage"), "BookingDetailPage", "admin") },
          { path: "customers", lazy: page(() => import("@/features/admin/ops/CustomersPage"), "CustomersPage", "admin") },
          { path: "customers/:id", lazy: page(() => import("@/features/admin/ops/CustomerDetailPage"), "CustomerDetailPage", "admin") },
          { path: "payments", lazy: page(() => import("@/features/admin/ops/MoneyPage"), "MoneyPage", "admin") },
          { path: "reviews", lazy: page(() => import("@/features/admin/ops/ReviewsPage"), "ReviewsPage", "admin") },
          { path: "settings", lazy: page(() => import("@/features/admin/ops/SettingsPage"), "SettingsPage", "admin") },
          { path: "audit", lazy: page(() => import("@/features/admin/ops/AuditPage"), "AuditPage", "admin") },
          // Professionals (Phase 4, W11, W15)
          { path: "professionals", lazy: page(() => import("@/features/admin/professionals/AdminProfessionalsPage"), "AdminProfessionalsPage", "admin") },
          { path: "professionals/new", lazy: page(() => import("@/features/admin/professionals/ProfessionalEditorPage"), "ProfessionalEditorPage", "admin") },
          { path: "professionals/:id", lazy: page(() => import("@/features/admin/professionals/ProfessionalDetailsPage"), "ProfessionalDetailsPage", "admin") },
          { path: "professionals/:id/edit", lazy: page(() => import("@/features/admin/professionals/ProfessionalEditorPage"), "ProfessionalEditorPage", "admin") },
          { path: "*", element: <NotFoundContent /> },
        ],
      },

      // Phase 1: design system and brand samples. Not in production builds (plan A7); a staging build
      // can keep them for the brand review with VITE_SHOW_STYLEGUIDE=1.
      ...(SHOW_STYLEGUIDE
        ? [
            { path: "/styleguide", lazy: page(() => import("@/features/styleguide/StyleguidePage"), "StyleguidePage", "styleguide", "samples") },
            { path: "/samples/home", lazy: page(() => import("@/features/samples/HomeSample"), "HomeSample", "samples", "public") },
            { path: "/samples/checkout", lazy: page(() => import("@/features/samples/CheckoutSample"), "CheckoutSample", "samples") },
            { path: "/samples/job-alert", lazy: page(() => import("@/features/samples/JobAlertSample"), "JobAlertSample", "samples") },
            { path: "/samples/admin", lazy: page(() => import("@/features/samples/AdminSample"), "AdminSample", "samples") },
          ]
        : []),
    ],
  },
]);
