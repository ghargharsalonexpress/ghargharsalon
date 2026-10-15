import type { CatalogResponse, SectionOf, ServiceSummaryDto } from "@brand/shared";

/** "auto" takes the first services of each category in turn, so the row shows variety. */
export function chooseServices(section: Pick<SectionOf<"services">, "mode" | "gender" | "slugs" | "limit">, catalog: CatalogResponse): ServiceSummaryDto[] {
  const fits = (service: ServiceSummaryDto) => section.gender === "all" || service.gender === section.gender;
  if (section.mode === "picked") {
    return section.slugs.map((slug) => catalog.services.find((service) => service.slug === slug)).filter((service): service is ServiceSummaryDto => Boolean(service)).slice(0, section.limit);
  }
  const queues = catalog.categories
    .filter((category) => section.gender === "all" || category.gender === section.gender)
    .map((category) => catalog.services.filter((service) => fits(service) && service.categorySlugs[0] === category.slug));
  const picked: ServiceSummaryDto[] = [];
  for (let round = 0; picked.length < section.limit && queues.some((queue) => queue.length > round); round++) {
    for (const queue of queues) {
      const service = queue[round];
      if (service && picked.length < section.limit && !picked.includes(service)) picked.push(service);
    }
  }
  return picked;
}
