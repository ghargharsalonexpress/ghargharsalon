export const ROLES = ["customer", "professional", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Where each role lands after logging in when there is no page to return to (plan A7). */
export const ROLE_HOME: Record<Role, string> = {
  customer: "/services",
  professional: "/pro",
  admin: "/admin",
};
