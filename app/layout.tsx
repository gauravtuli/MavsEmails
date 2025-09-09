/**
 * Root layout component required by Next.js App Router.
 *
 * Every page in the `app/` directory must be wrapped in a layout.  If a
 * layout file is missing at the root, Next.js will throw an error at
 * build time like:
 *   "page.tsx doesn't have a root layout. To fix this error, make sure
 *    every page has a root layout."
 *
 * This file defines the root-level HTML and BODY tags and renders
 * children inside.  You can customize global metadata, fonts, or
 * styles here.  For now, we keep it simple and set the language to
 * English.  If you have a `globals.css` or similar, you can import
 * it here.
 */
import React, { ReactNode } from 'react';

export const metadata = {
  title: 'Bulk Gmail Sender',
  description: 'Send customized bulk emails via Gmail SMTP without OAuth',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">
        {children}
      </body>
    </html>
  );
}