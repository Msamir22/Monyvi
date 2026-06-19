const e2eAuthDeepLinkBase = "monyvi://e2e-auth";

function buildE2eAuthDeepLink(env = process.env) {
  if (!env.MAESTRO_E2E_EMAIL || !env.MAESTRO_E2E_PASSWORD) {
    return undefined;
  }

  const email = encodeURIComponent(env.MAESTRO_E2E_EMAIL);
  const password = encodeURIComponent(env.MAESTRO_E2E_PASSWORD);
  return `${e2eAuthDeepLinkBase}?email=${email}&password=${password}`;
}

function applyE2eAuthDeepLink(env = process.env) {
  env.MAESTRO_E2E_AUTH_DEEPLINK ??= buildE2eAuthDeepLink(env);
}

module.exports = {
  applyE2eAuthDeepLink,
  buildE2eAuthDeepLink,
};
