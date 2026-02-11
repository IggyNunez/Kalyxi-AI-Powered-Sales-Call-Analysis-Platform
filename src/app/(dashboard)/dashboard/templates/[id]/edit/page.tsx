"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import TemplateBuilder from "@/components/templates/TemplateBuilder";
import { Template, CriteriaGroup, Criteria } from "@/types/database";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { initializeTemplate } = useTemplateBuilderStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const id = params.id as string;
        const response = await fetch(
          `/api/templates/${id}?include_groups=true&include_criteria=true`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Template not found");
          } else {
            setError("Failed to load template");
          }
          return;
        }

        const { data } = await response.json();
        const template = data as Template & {
          groups?: (CriteriaGroup & { criteria?: Criteria[] })[];
        };

        // Extract groups and criteria
        const groups: CriteriaGroup[] = [];
        const criteria: Criteria[] = [];

        if (template.groups) {
          template.groups.forEach((group) => {
            groups.push({
              id: group.id,
              template_id: group.template_id,
              name: group.name,
              description: group.description,
              sort_order: group.sort_order,
              weight: group.weight,
              is_required: group.is_required,
              is_collapsed_by_default: group.is_collapsed_by_default,
              created_at: group.created_at,
              updated_at: group.updated_at,
            });

            if (group.criteria) {
              criteria.push(...group.criteria);
            }
          });
        }

        initializeTemplate(template, groups, criteria);
      } catch (err) {
        console.error("Error fetching template:", err);
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [params.id, initializeTemplate]);

  if (loading) {
    return (
      <div className="animate-fade-in p-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-4" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mb-8" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
            <div className="h-96 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard/templates")}
            className="text-primary hover:underline"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return <TemplateBuilder isNew={false} />;
}
