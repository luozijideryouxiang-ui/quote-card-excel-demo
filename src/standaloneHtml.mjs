export function makeStandaloneHtml({ html, css, appJs, apiBase }) {
  const bootstrap = `window.__QUOTE_API_BASE__ = ${JSON.stringify(apiBase)};`;

  return html
    .replace('<link rel="stylesheet" href="/styles.css" />', `<style>\n${css}\n</style>`)
    .replaceAll('href="/settings.html"', `href="${apiBase}/settings.html"`)
    .replaceAll('href="/"', `href="${apiBase}/"`)
    .replace(
      '<script type="module" src="/app.js"></script>',
      `<script>\n${bootstrap}\n</script>\n<script type="module">\n${appJs}\n</script>`,
    );
}
