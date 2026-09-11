/**
 * Empty module shim. Aliased over `react-native` (Turbopack `resolveAlias` in
 * next.config.js) so the ATS SDK's unused mobile-wallet connectors don't drag
 * native code into the web bundle. Our flow signs via MetaMask only.
 */
export default {};
