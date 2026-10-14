import { useEffect } from "react";
import { isLanguage, type UserResponse } from "@brand/shared";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { queryClient } from "./queryClient";
import { sessionQuery, setSessionUser, useCachedUser } from "./session";

/**
 * Keeps the interface language and the profile language in step (plan C3, W18):
 * the profile wins when someone signs in, and a switch made while signed in is saved
 * to the profile so emails follow it too.
 */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const user = useCachedUser();
  const userId = user?.id;
  const profileLanguage = user?.locale;

  useEffect(() => {
    if (profileLanguage && profileLanguage !== i18n.resolvedLanguage) void i18n.changeLanguage(profileLanguage);
    // Only when the signed-in person or their saved language changes.
  }, [userId, profileLanguage, i18n]);

  useEffect(() => {
    const save = (language: string) => {
      const current = queryClient.getQueryData(sessionQuery.queryKey)?.user;
      if (!current || !isLanguage(language) || language === current.locale) return;
      api
        .patch<UserResponse>("/v1/me", { locale: language })
        .then(({ user: updated }) => setSessionUser(updated))
        .catch(() => {
          // Offline or signed out: the choice still applies on this device (localStorage).
        });
    };
    i18n.on("languageChanged", save);
    return () => i18n.off("languageChanged", save);
  }, [i18n]);

  return null;
}
