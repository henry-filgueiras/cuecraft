/**
 * CSS is a thing the bundler understands and the type checker does not.
 *
 * Remotion compiles the composition with its own webpack config, which handles a stylesheet
 * import and the font files it references (decision:5). `tsc` has no such notion, so the import
 * is declared here rather than suppressed at the call site — one declaration for a whole class
 * of file, in the config that is allowed to have a DOM.
 */
declare module "*.css";
