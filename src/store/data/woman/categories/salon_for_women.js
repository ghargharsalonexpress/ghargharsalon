import { bleachAndDetan, body_polishing_packages, cleanupPackages, manicure_pedicure_packages, salon_for_womenPackages } from "../packages/salon_for_womenPackages.js";

export const salon_for_womenCategory = {
  id: "salon_for_women",
  name: "Salon for Women",
  filters: ["Shadadi Packages", "K-Rituals", "Facials", "Waxing", "Manicure & Pedicure", "Scrubs", "Threading", "Bleach", "korean Glow", "Hair Services", "InstaLight Pack","Body Polishing", "Cleanup", "Bleach and Detan"],
  packages: [...salon_for_womenPackages, ...manicure_pedicure_packages, ...body_polishing_packages, ...cleanupPackages, ...bleachAndDetan]
};
