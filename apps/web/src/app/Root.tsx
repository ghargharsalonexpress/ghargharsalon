import { Outlet, ScrollRestoration } from "react-router";
import { UpdatePrompt } from "@/features/system/UpdatePrompt";

/** Scroll to the top on new pages, back to where you were on Back (sheets and filters opt out). */
export function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <UpdatePrompt />
    </>
  );
}
