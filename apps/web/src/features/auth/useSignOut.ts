import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { loginPathFor } from "@/app/session";
import { useToast } from "@/design-system";
import { useLogout } from "./api";

/** Log out, confirm with a toast, land on the login page. Works even if the API call fails. */
export function useSignOut() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useLogout();

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast(t("state.loggedOut"));
        void navigate(loginPathFor(window.location.pathname), { replace: true });
      },
    });

  return { signOut, pending: logout.isPending };
}
