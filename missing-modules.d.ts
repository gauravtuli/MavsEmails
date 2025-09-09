/*
 * Module declaration shims for third‑party packages that do not ship
 * TypeScript type definitions.  Without these declarations, the
 * TypeScript compiler will error when compiling under `strict` mode
 * because it cannot find any declarations for the imported modules.
 *
 * If you prefer to use proper type definitions instead of these
 * shims, install the corresponding `@types/*` package as a
 * development dependency.  For example:
 *   npm install --save-dev @types/nodemailer @types/xlsx @types/handlebars
 */

declare module 'nodemailer' {
  const nodemailer: any;
  export default nodemailer;
}

declare module 'xlsx' {
  const xlsx: any;
  export default xlsx;
}

declare module 'handlebars' {
  const Handlebars: any;
  export default Handlebars;
}