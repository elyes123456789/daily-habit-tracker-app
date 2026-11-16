/**
 * Extends app.json. The only dynamic value is the web base path, which is set
 * when the site is served from a sub-path (GitHub Pages serves a project site
 * from /<repository-name>). Locally and on a root domain it stays unset.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.WEB_BASE_PATH ? { baseUrl: process.env.WEB_BASE_PATH } : {}),
  },
});
