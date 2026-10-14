// Node module hooks so the legacy catalog files (written for Vite) can be
// imported by plain Node scripts:
//  - extensionless relative imports ("../packages/spaPackages") resolve to ".js"
//  - image/video imports resolve to their file path instead of failing

const ASSET_RE = /\.(png|jpe?g|gif|webp|avif|svg|mp4)$/i;
const HAS_EXT_RE = /\.[a-z0-9]+$/i;

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (error?.code === "ERR_MODULE_NOT_FOUND" && isRelative && !HAS_EXT_RE.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (ASSET_RE.test(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(`asset:${new URL(url).pathname}`)};`,
    };
  }
  return nextLoad(url, context);
}
