"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import TemplateBuilder from "@/components/templates/TemplateBuilder";

export default function NewTemplatePage() {
  const router = useRouter();
  const { initializeNewTemplate } = useTemplateBuilderStore();

  useEffect(() => {
    initializeNewTemplate();
  }, [initializeNewTemplate]);

  return <TemplateBuilder isNew={true} />;
}
