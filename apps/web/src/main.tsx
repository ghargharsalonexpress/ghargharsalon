import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "./i18n";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { AppProviders } from "./app/AppProviders";
import { installAuthLostHandler } from "./app/authLost";
import { router } from "./app/router";
import { registerServiceWorker } from "./lib/pwa";
import { installErrorReporting } from "./lib/reportError";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

installAuthLostHandler(router);
installErrorReporting();
registerServiceWorker();

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
