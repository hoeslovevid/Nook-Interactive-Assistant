(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; root.NookAlerts = api; })(typeof window === 'undefined' ? globalThis : window, () => {
  function isQuiet(settings, date = new Date()) {
    if (!settings?.quietHours) return false;
    const minute = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const now = date.getHours() * 60 + date.getMinutes(), start = minute(settings.quietStart), end = minute(settings.quietEnd);
    return start === end || (start < end ? now >= start && now < end : now >= start || now < end);
  }
  return { isQuiet };
});
