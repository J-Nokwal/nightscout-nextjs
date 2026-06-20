import Link from "next/link";
import { NightscoutLogo } from "@/components/NightscoutLogo";

export const metadata = {
  title: "Medical Disclaimer",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        <div className="flex flex-col items-center gap-3 text-center">
          <NightscoutLogo size={56} />
          <h1 className="text-2xl font-bold">Nightscout</h1>
          <p className="text-sm text-muted-foreground">CGM Remote Monitor</p>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4">
          <h2 className="text-lg font-bold text-destructive uppercase tracking-wide">
            Important Medical Disclaimer
          </h2>

          <p className="text-sm leading-relaxed">
            <strong>This software is NOT a medical device.</strong> It is not approved, certified, or
            regulated by the FDA, CE, TGA, Health Canada, or any other regulatory authority.
            It is intended for <strong>informational and educational purposes only</strong>.
          </p>

          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>Do not make medical decisions based on this app.</strong> Never adjust insulin
              doses, take glucose tablets, or change your treatment based solely on data shown here.
            </li>
            <li>
              Glucose readings may be <strong>delayed, missing, or inaccurate</strong> due to network
              issues, sensor errors, calibration drift, or software bugs.
            </li>
            <li>
              Always verify your glucose level with your <strong>CGM device&apos;s native display</strong> or
              a <strong>calibrated blood glucose meter</strong> before taking any clinical action.
            </li>
            <li>
              <strong>In a medical emergency, call emergency services immediately.</strong> Do not rely
              on this application during emergencies.
            </li>
            <li>
              This software is provided <strong>&quot;as is&quot;</strong> with no warranty of any kind,
              express or implied, including fitness for a particular purpose.
            </li>
          </ul>

          <p className="text-sm leading-relaxed">
            The authors, contributors, and maintainers of this project <strong>accept no liability</strong> for
            any harm, injury, loss, or damage resulting from the use or misuse of this software.
            By using Nightscout, you acknowledge that you have read and understood this disclaimer
            and agree to use this software entirely <strong>at your own risk</strong>.
          </p>
        </div>

        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="font-semibold">What is Nightscout?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nightscout is a community-driven, open-source project originally created in 2013 to allow
              remote monitoring of CGM data — born from the #WeAreNotWaiting movement of parents of
              children with Type 1 Diabetes. This is an independent reimplementation built with Next.js.
              It is not affiliated with Abbott, Dexcom, Medtronic, or any medical device manufacturer.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Development Status</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This software is currently under <strong>active development</strong>. Features may be
              incomplete, change without notice, or contain bugs. It should not be used as your primary
              or sole method of glucose monitoring. Always have a backup monitoring method available.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Data Privacy</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All data is stored in your own database (MongoDB or PostgreSQL) under your control.
              This application does not transmit your glucose data to any third party unless you
              explicitly configure a notification service (Pushover, Telegram, IFTTT). You are
              responsible for securing your deployment and protecting your personal health data
              in compliance with applicable privacy laws (HIPAA, GDPR, etc.).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Open Source License</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This software is released under the <strong>MIT License</strong>. You are free to use,
              modify, and distribute it subject to the terms of that license. The full license text
              is included in the project repository.
            </p>
          </section>
        </div>

        <div className="flex justify-center">
          <Link
            href="/dashboard"
            className="text-sm underline underline-offset-4 text-primary hover:text-primary/80"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Last updated: 2026 · Nightscout Next.js · Open Source CGM Remote Monitor
        </p>
      </div>
    </div>
  );
}
