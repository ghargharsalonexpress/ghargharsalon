import i18n from "./index";

type Bundle = Record<string, unknown>;
type Pair = Promise<[{ default: Bundle }, { default: Bundle }]>;

const loaders = {
  samples: (): Pair => Promise.all([import("./locales/en/samples.json"), import("./locales/hi/samples.json")]),
  styleguide: (): Pair => Promise.all([import("./locales/en/styleguide.json"), import("./locales/hi/styleguide.json")]),
  auth: (): Pair => Promise.all([import("./locales/en/auth.json"), import("./locales/hi/auth.json")]),
  public: (): Pair => Promise.all([import("./locales/en/public.json"), import("./locales/hi/public.json")]),
  legal: (): Pair => Promise.all([import("./locales/en/legal.json"), import("./locales/hi/legal.json")]),
  account: (): Pair => Promise.all([import("./locales/en/account.json"), import("./locales/hi/account.json")]),
  booking: (): Pair => Promise.all([import("./locales/en/booking.json"), import("./locales/hi/booking.json")]),
  pro: (): Pair => Promise.all([import("./locales/en/pro.json"), import("./locales/hi/pro.json")]),
  // The admin is English-only (plan A3): Hindi readers get the same English strings.
  admin: async (): Pair => {
    const en = await import("./locales/en/admin.json");
    return [en, en];
  },
};

export type Namespace = keyof typeof loaders;

/**
 * Loads feature strings together with their route chunk, keeping them out of the
 * entry bundle (plan C3). Both languages load so the switch stays instant.
 */
export async function loadNamespaces(...names: Namespace[]): Promise<void> {
  await Promise.all(
    names.map(async (ns) => {
      if (i18n.hasResourceBundle("en", ns)) return;
      const [en, hi] = await loaders[ns]();
      i18n.addResourceBundle("en", ns, en.default);
      i18n.addResourceBundle("hi", ns, hi.default);
    }),
  );
}
