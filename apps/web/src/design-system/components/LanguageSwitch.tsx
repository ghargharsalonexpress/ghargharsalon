import { useTranslation } from "react-i18next";
import { SegmentedControl } from "./SegmentedControl";

type Lang = "en" | "hi";

export interface LanguageSwitchProps {
  name?: string;
  /** compact: "EN / हिं" for headers. full: "English / हिन्दी" with a visible label, for forms. */
  variant?: "compact" | "full";
  /** Visible label for the full variant; defaults to "Language". */
  label?: string;
}

/** Changing language updates <html lang>, storage and all text instantly (and the profile when signed in). */
export function LanguageSwitch({ name = "language", variant = "compact", label }: LanguageSwitchProps) {
  const { t, i18n } = useTranslation();
  const current: Lang = i18n.language === "hi" ? "hi" : "en";
  const full = variant === "full";

  return (
    <SegmentedControl<Lang>
      label={label ?? t("language.label")}
      showLabel={full}
      fullWidth={full}
      size={full ? "lg" : undefined}
      name={name}
      value={current}
      onChange={(next) => void i18n.changeLanguage(next)}
      options={[
        { value: "en", label: <span lang="en">{full ? t("language.en") : "EN"}</span> },
        { value: "hi", label: <span lang="hi">{full ? t("language.hi") : "हिं"}</span> },
      ]}
    />
  );
}
