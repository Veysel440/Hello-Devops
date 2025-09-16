export const buildInfo = {
  version: process.env.APP_VERSION ?? "dev",
  sha: process.env.APP_SHA ?? "dirty",
};
