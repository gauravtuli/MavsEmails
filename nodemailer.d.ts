/*
 * Provide a minimal module declaration for the `nodemailer` package.
 *
 * When using TypeScript with `strict` mode enabled, importing packages
 * that don't ship their own type definitions (or have missing ones) can
 * cause the compiler to throw an error. This declaration tells
 * TypeScript to treat the `nodemailer` module as having the `any` type,
 * which suppresses the "Could not find a declaration file" error
 * encountered during build on Vercel. If you prefer stronger typing,
 * install the official `@types/nodemailer` package as a dev
 * dependency instead.
 */
declare module 'nodemailer';