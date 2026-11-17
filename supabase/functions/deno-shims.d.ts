/**
 * Editor-only types for the Supabase Edge Functions in this folder.
 *
 * The functions run on Deno (which provides `Deno` and resolves `npm:` imports),
 * but VS Code checks them with the regular TypeScript server. These declarations
 * describe just what the functions use, so the editor shows no false errors.
 * They are never deployed and have no effect at runtime.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};

// Same API as the app's own @supabase/supabase-js dependency.
declare module 'npm:@supabase/supabase-js@2.45.4' {
  export * from '@supabase/supabase-js';
}

// Minimal nodemailer surface used by send-receipt.
declare module 'npm:nodemailer@6.9.16' {
  interface SentMessageInfo {
    messageId: string;
    accepted: Array<string | { address: string }>;
    rejected: Array<string | { address: string }>;
    response: string;
  }
  interface Transporter {
    sendMail(mail: {
      from: string;
      to: string;
      replyTo?: string;
      subject: string;
      text?: string;
      html?: string;
    }): Promise<SentMessageInfo>;
  }
  const nodemailer: {
    createTransport(options: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
    }): Transporter;
  };
  export default nodemailer;
}
