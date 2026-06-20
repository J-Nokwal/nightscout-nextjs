import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NightscoutLogo } from "@/components/NightscoutLogo";

// Server component — safely reads env vars without exposing values
function EnvCheck({ label, envKey }: { label: string; envKey: string }) {
  const set = !!process.env[envKey];
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-mono text-xs text-muted-foreground">{envKey}</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{label}</span>
        <Badge className={set ? "bg-green-600 text-white" : "bg-red-500 text-white"}>
          {set ? "Set ✓" : "Missing"}
        </Badge>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const apiSecretSet    = !!process.env.API_SECRET;
  const mongoSet        = !!process.env.MONGODB_URI;
  const authSecretSet   = !!process.env.AUTH_SECRET;
  const allRequired     = apiSecretSet && mongoSet && authSecretSet;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <NightscoutLogo size={56} />
          <span className="text-xl font-bold tracking-tight">Nightscout</span>
          <span className="text-xs text-muted-foreground">CGM Remote Monitor</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">First-Run Setup</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Nightscout is configured via environment variables. Set these in your{" "}
              <code className="text-xs bg-muted px-1 rounded">.env.local</code> file and restart the server.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Required vars */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required</p>
              <div className="space-y-2 rounded-lg border p-3">
                <EnvCheck label="Admin password" envKey="API_SECRET" />
                <EnvCheck label="MongoDB connection" envKey="MONGODB_URI" />
                <EnvCheck label="Session secret" envKey="AUTH_SECRET" />
              </div>
            </div>

            {/* Optional vars */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optional</p>
              <div className="space-y-2 rounded-lg border p-3">
                <EnvCheck label="Pushover app token" envKey="PUSHOVER_APP_TOKEN" />
                <EnvCheck label="Pushover user key"  envKey="PUSHOVER_USER_KEY" />
                <EnvCheck label="Telegram bot token" envKey="TELEGRAM_BOT_TOKEN" />
                <EnvCheck label="Telegram chat ID"   envKey="TELEGRAM_CHAT_ID" />
                <EnvCheck label="Redis cache"         envKey="REDIS_URL" />
                <EnvCheck label="Read-only share token" envKey="SHARE_TOKEN" />
              </div>
            </div>

            {/* Example .env */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Example <code>.env.local</code>
              </p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto leading-relaxed">
{`MONGODB_URI=mongodb://localhost:27017/nightscout
API_SECRET=your_secret_at_least_12_chars
AUTH_SECRET=a_random_string_for_sessions
AUTH_URL=http://localhost:3000`}
              </pre>
            </div>

            {/* Status + action */}
            <div className="flex items-center justify-between pt-2 border-t">
              {allRequired ? (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  All required variables are set. You&apos;re ready to go.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set the missing variables and restart the server.
                </p>
              )}
              <Button render={<Link href="/login" />} variant={allRequired ? "default" : "outline"} size="sm">
                {allRequired ? "Go to Login →" : "Back to Login"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Nightscout uses a single <strong>API_SECRET</strong> as your admin password — there are no user
          accounts. Anyone with the secret has full access. Share the{" "}
          <code className="bg-muted px-1 rounded">SHARE_TOKEN</code> with followers for read-only access.
        </p>
      </div>
    </div>
  );
}
