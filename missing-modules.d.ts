/* Module declaration shims for third‑party packages without TypeScript definitions. */
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
