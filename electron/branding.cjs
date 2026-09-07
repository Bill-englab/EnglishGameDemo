function applyBranding(app) {
  // Keep cookies, cache and local preferences in the launcher's existing paths.
  const userData = app.getPath('userData');
  const sessionData = app.getPath('sessionData');
  app.setName('TigerTales');
  app.setPath('userData', userData);
  app.setPath('sessionData', sessionData);
}

module.exports = { applyBranding };
