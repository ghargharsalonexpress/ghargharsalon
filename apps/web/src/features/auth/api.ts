import type {
  ForgotPasswordData,
  LoginData,
  ProfileData,
  ResetPasswordData,
  SignupData,
  TokenCheckResponse,
  UpdateMeInput,
  UserResponse,
} from "@brand/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/app/queryClient";
import { setSessionUser } from "@/app/session";
import { api } from "@/lib/api";

const signedIn = ({ user }: UserResponse) => setSessionUser(user);

export const useLogin = () => useMutation({ mutationFn: (input: LoginData) => api.post<UserResponse>("/v1/auth/login", input), onSuccess: signedIn });

export const useSignup = () =>
  useMutation({ mutationFn: (input: SignupData) => api.post<UserResponse>("/v1/auth/signup", input), onSuccess: signedIn });

export const useForgotPassword = () =>
  useMutation({ mutationFn: (input: ForgotPasswordData) => api.post<Record<string, never>>("/v1/auth/password/forgot", input) });

/** Checks the emailed link before showing the password field. */
export const useTokenCheck = (token: string) =>
  useQuery({
    queryKey: ["password-token", token],
    queryFn: () => api.post<TokenCheckResponse>("/v1/auth/password/check", { token }),
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

export const useResetPassword = () =>
  useMutation({ mutationFn: (input: ResetPasswordData) => api.post<UserResponse>("/v1/auth/password/reset", input), onSuccess: signedIn });

export const useUpdateProfile = () =>
  useMutation({ mutationFn: (input: ProfileData | UpdateMeInput) => api.patch<UserResponse>("/v1/me", input), onSuccess: signedIn });

/** Clears the session and everything cached for that person. */
export const useLogout = () =>
  useMutation({
    mutationFn: () => api.post<void>("/v1/auth/logout"),
    onSettled: () => {
      setSessionUser(null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    },
  });
