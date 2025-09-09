// This file provides a module declaration for the "nodemailer" package.
// Without this, the TypeScript compiler will error when importing nodemailer
// because it cannot find a declaration file. Declaring the module as `any`
// satisfies TypeScript and allows the project to build on Vercel.

declare module 'nodemailer' {
  const nodemailer: any;
  export default nodemailer;
}