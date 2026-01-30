"use client";

import { useEffect, useState } from "react";

interface CustomCodeSettings {
  custom_css?: string;
  custom_head_html?: string;
}

export function CustomCodeInjector() {
  const [settings, setSettings] = useState<CustomCodeSettings>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/appearance");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSettings({
              custom_css: data.data.custom_css,
              custom_head_html: data.data.custom_head_html,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch custom code settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    // Inject custom CSS
    if (settings.custom_css) {
      const existingStyle = document.getElementById("custom-org-css");
      if (existingStyle) {
        existingStyle.textContent = settings.custom_css;
      } else {
        const style = document.createElement("style");
        style.id = "custom-org-css";
        style.textContent = settings.custom_css;
        document.head.appendChild(style);
      }
    }

    // Cleanup function to remove the style when component unmounts
    return () => {
      const style = document.getElementById("custom-org-css");
      if (style) {
        style.remove();
      }
    };
  }, [settings.custom_css]);

  useEffect(() => {
    // Inject custom head HTML
    if (settings.custom_head_html) {
      const existingContainer = document.getElementById("custom-org-head-html");
      if (existingContainer) {
        existingContainer.innerHTML = settings.custom_head_html;
      } else {
        const container = document.createElement("div");
        container.id = "custom-org-head-html";
        container.innerHTML = settings.custom_head_html;

        // Move script and link elements to head, keep others in container
        const scripts = container.querySelectorAll("script");
        const links = container.querySelectorAll("link");
        const metas = container.querySelectorAll("meta");

        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          Array.from(script.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = script.textContent;
          document.head.appendChild(newScript);
        });

        links.forEach((link) => {
          document.head.appendChild(link.cloneNode(true));
        });

        metas.forEach((meta) => {
          document.head.appendChild(meta.cloneNode(true));
        });
      }
    }

    // Cleanup function
    return () => {
      const container = document.getElementById("custom-org-head-html");
      if (container) {
        container.remove();
      }
      // Note: We don't remove injected scripts/links/metas to avoid breaking things
      // They will be properly cleaned up on full page reload
    };
  }, [settings.custom_head_html]);

  // This component doesn't render anything visible
  return null;
}
