/** Plain (server-safe) module: inlined before first paint so there is no flash of the wrong theme. */
export const themeStorageKey = "sukoon-theme";
export const themeBootScript = `(function(){try{var c=localStorage.getItem("${themeStorageKey}");var d=c==="dark"||((!c||c==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
