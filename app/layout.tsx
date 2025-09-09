// app/layout.tsx
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
