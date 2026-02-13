"use client";

import { useEffect } from "react";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import TemplateWizard from "@/components/templates/TemplateWizard";

export default function NewTemplatePage() {
  const { initializeNewTemplate } = useTemplateBuilderStore();

  useEffect(() => {
    initializeNewTemplate();
  }, [initializeNewTemplate]);

  return <TemplateWizard isNew={true} />;
}
