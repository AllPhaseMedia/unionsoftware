"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, Loader2, Save, Code } from "lucide-react";
import { toast } from "sonner";

interface AppearanceSettings {
  logo_url?: string;
  logo_height?: string;
  organization_name?: string;
  menu_bg_color?: string;
  menu_text_color?: string;
  menu_accent_color?: string;
  custom_css?: string;
  custom_head_html?: string;
}

export default function AppearancePage() {
  const [settings, setSettings] = useState<AppearanceSettings>({
    logo_height: "60",
    organization_name: "",
    menu_bg_color: "#1f2937",
    menu_text_color: "#f9fafb",
    menu_accent_color: "#3b82f6",
    custom_css: "",
    custom_head_html: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/appearance");
      const data = await response.json();
      if (data.success && data.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/settings/appearance", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSettings((prev) => ({ ...prev, logo_url: data.data.logo_url }));
        toast.success("Logo uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload logo");
      }
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Are you sure you want to remove the logo?")) return;

    try {
      const response = await fetch("/api/settings/appearance", {
        method: "DELETE",
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, logo_url: undefined }));
        toast.success("Logo removed");
      }
    } catch (error) {
      toast.error("Failed to remove logo");
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_height: settings.logo_height,
          organization_name: settings.organization_name,
          menu_bg_color: settings.menu_bg_color,
          menu_text_color: settings.menu_text_color,
          menu_accent_color: settings.menu_accent_color,
          custom_css: settings.custom_css,
          custom_head_html: settings.custom_head_html,
        }),
      });

      if (response.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const logoHeight = parseInt(settings.logo_height || "60", 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="text-gray-500">Customize your organization&apos;s branding</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
        disabled={isUploading}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo & Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Logo & Branding</CardTitle>
            <CardDescription>
              Upload a logo or set your organization name to display in the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organization_name">Organization Name</Label>
              <Input
                id="organization_name"
                value={settings.organization_name || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, organization_name: e.target.value }))
                }
                placeholder="Your Organization Name"
              />
              <p className="text-xs text-gray-500">
                Displayed in the sidebar when no logo is uploaded
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              {settings.logo_url ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[100px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.logo_url}
                      alt="Organization logo"
                      style={{ height: `${logoHeight}px`, width: "auto" }}
                      className="object-contain max-w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleUploadClick}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Replace
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteLogo}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="w-full border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload logo</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Logo Height */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Logo Height</Label>
                <span className="text-sm text-gray-500">{logoHeight}px</span>
              </div>
              <Slider
                value={[logoHeight]}
                onValueChange={([value]) =>
                  setSettings((prev) => ({ ...prev, logo_height: String(value) }))
                }
                min={20}
                max={200}
                step={5}
              />
              <p className="text-xs text-gray-500">
                Adjust the height while maintaining aspect ratio (20-200px)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Menu Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Colors</CardTitle>
            <CardDescription>
              Customize the sidebar navigation colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu_bg_color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="menu_bg_color"
                  value={settings.menu_bg_color || "#1f2937"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_bg_color: e.target.value }))
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.menu_bg_color || "#1f2937"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_bg_color: e.target.value }))
                  }
                  className="flex-1"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu_text_color">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="menu_text_color"
                  value={settings.menu_text_color || "#f9fafb"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_text_color: e.target.value }))
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.menu_text_color || "#f9fafb"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_text_color: e.target.value }))
                  }
                  className="flex-1"
                  placeholder="#f9fafb"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu_accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="menu_accent_color"
                  value={settings.menu_accent_color || "#3b82f6"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_accent_color: e.target.value }))
                  }
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.menu_accent_color || "#3b82f6"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, menu_accent_color: e.target.value }))
                  }
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="mb-2 block">Preview</Label>
              <div
                className="rounded-lg p-4 space-y-2"
                style={{ backgroundColor: settings.menu_bg_color }}
              >
                <div
                  className="text-sm font-medium"
                  style={{ color: settings.menu_text_color }}
                >
                  Dashboard
                </div>
                <div
                  className="text-sm px-2 py-1 rounded"
                  style={{
                    backgroundColor: settings.menu_accent_color,
                    color: settings.menu_text_color,
                  }}
                >
                  Grievances
                </div>
                <div
                  className="text-sm opacity-70"
                  style={{ color: settings.menu_text_color }}
                >
                  Members
                </div>
                <div
                  className="text-sm opacity-70"
                  style={{ color: settings.menu_text_color }}
                >
                  Settings
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Code Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <CardTitle>Custom Code</CardTitle>
          </div>
          <CardDescription>
            Add custom CSS and HTML to customize the appearance of your application.
            Use with caution - invalid code may affect the application&apos;s functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom CSS */}
          <div className="space-y-2">
            <Label htmlFor="custom_css">Custom CSS</Label>
            <Textarea
              id="custom_css"
              value={settings.custom_css || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, custom_css: e.target.value }))
              }
              placeholder={`/* Add custom styles here */
.my-custom-class {
  color: #333;
}

/* Override default styles */
.grievance-card {
  border-radius: 12px;
}`}
              className="font-mono text-sm min-h-[200px]"
            />
            <p className="text-xs text-gray-500">
              CSS will be injected into the page. Use standard CSS syntax.
            </p>
          </div>

          {/* Custom Head HTML */}
          <div className="space-y-2">
            <Label htmlFor="custom_head_html">Custom HTML (Head)</Label>
            <Textarea
              id="custom_head_html"
              value={settings.custom_head_html || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, custom_head_html: e.target.value }))
              }
              placeholder={`<!-- Add custom scripts, meta tags, or links here -->
<meta name="custom-meta" content="value">
<link rel="stylesheet" href="https://example.com/styles.css">
<script src="https://example.com/script.js"></script>`}
              className="font-mono text-sm min-h-[150px]"
            />
            <p className="text-xs text-gray-500">
              HTML will be injected into the {"<head>"} section. Useful for analytics scripts, custom fonts, or external stylesheets.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
