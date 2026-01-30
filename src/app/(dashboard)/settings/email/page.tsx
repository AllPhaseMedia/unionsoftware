"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: string;
}

const defaultSettings: EmailSettings = {
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "tls",
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
  smtp_enabled: "false",
};

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/email");
      const data = await response.json();
      if (data.success) {
        setSettings({ ...defaultSettings, ...data.data });
      }
    } catch (error) {
      console.error("Error fetching email settings:", error);
      toast.error("Failed to load email settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Email settings saved successfully");
    } catch (error) {
      console.error("Error saving email settings:", error);
      toast.error("Failed to save email settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({ success: true, message: "Test email sent successfully!" });
        toast.success("Test email sent successfully");
      } else {
        setTestResult({ success: false, message: data.error || "Failed to send test email" });
        toast.error(data.error || "Failed to send test email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      setTestResult({ success: false, message: "Failed to send test email" });
      toast.error("Failed to send test email");
    } finally {
      setIsTesting(false);
    }
  };

  const updateSetting = (key: keyof EmailSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Settings</h1>
        <p className="text-gray-500">Configure SMTP settings for sending emails</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>
            Configure your SMTP server settings to enable email sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="smtp_enabled">Enable Email Sending</Label>
              <p className="text-sm text-gray-500">
                Turn on to enable sending emails from the application
              </p>
            </div>
            <Switch
              id="smtp_enabled"
              checked={settings.smtp_enabled === "true"}
              onCheckedChange={(checked) =>
                updateSetting("smtp_enabled", checked ? "true" : "false")
              }
            />
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Server Settings</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.example.com"
                  value={settings.smtp_host}
                  onChange={(e) => updateSetting("smtp_host", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  placeholder="587"
                  value={settings.smtp_port}
                  onChange={(e) => updateSetting("smtp_port", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_secure">Security</Label>
              <Select
                value={settings.smtp_secure}
                onValueChange={(value) => updateSetting("smtp_secure", value)}
              >
                <SelectTrigger id="smtp_secure">
                  <SelectValue placeholder="Select security type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS (Port 587)</SelectItem>
                  <SelectItem value="ssl">SSL (Port 465)</SelectItem>
                  <SelectItem value="none">None (Port 25)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Authentication</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp_user">Username</Label>
                <Input
                  id="smtp_user"
                  placeholder="your-email@example.com"
                  value={settings.smtp_user}
                  onChange={(e) => updateSetting("smtp_user", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">Password</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="Enter password"
                  value={settings.smtp_password}
                  onChange={(e) => updateSetting("smtp_password", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  For Gmail, use an App Password instead of your regular password
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Sender Information</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp_from_email">From Email</Label>
                <Input
                  id="smtp_from_email"
                  type="email"
                  placeholder="noreply@yourunion.org"
                  value={settings.smtp_from_email}
                  onChange={(e) => updateSetting("smtp_from_email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_from_name">From Name</Label>
                <Input
                  id="smtp_from_name"
                  placeholder="Your Union Name"
                  value={settings.smtp_from_name}
                  onChange={(e) => updateSetting("smtp_from_name", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Email</CardTitle>
          <CardDescription>
            Send a test email to verify your SMTP configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter email address to send test"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTestEmail}
              disabled={isTesting || settings.smtp_enabled !== "true"}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </div>

          {settings.smtp_enabled !== "true" && (
            <p className="text-sm text-amber-600">
              Enable email sending above before testing
            </p>
          )}

          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                testResult.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common SMTP Providers</CardTitle>
          <CardDescription>
            Quick reference for popular email providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Gmail</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: smtp.gmail.com<br />
                Port: 587 (TLS) or 465 (SSL)<br />
                Requires App Password
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Microsoft 365</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: smtp.office365.com<br />
                Port: 587 (TLS)<br />
                Use your Microsoft account
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">SendGrid</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: smtp.sendgrid.net<br />
                Port: 587 (TLS)<br />
                Username: apikey
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Mailgun</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: smtp.mailgun.org<br />
                Port: 587 (TLS)<br />
                Check Mailgun dashboard
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Amazon SES</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: email-smtp.[region].amazonaws.com<br />
                Port: 587 (TLS)<br />
                Use SES SMTP credentials
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Postmark</h4>
              <p className="text-sm text-gray-500 mt-1">
                Host: smtp.postmarkapp.com<br />
                Port: 587 (TLS)<br />
                Use Server API Token
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
