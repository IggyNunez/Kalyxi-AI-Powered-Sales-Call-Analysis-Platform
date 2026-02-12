"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  GitBranch,
  ChevronRight,
  Calendar,
  Target,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";

interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  snapshot: {
    template: {
      name: string;
      description?: string;
      scoring_method: string;
      pass_threshold: number;
    };
    groups: Array<{ id: string; name: string }>;
    criteria: Array<{ id: string; name: string }>;
  };
  change_summary?: string;
  created_by: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateVersionsPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const templateId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/templates/${templateId}/versions`);
        if (!response.ok) {
          throw new Error("Failed to fetch versions");
        }
        const data = await response.json();
        setVersions(data.data);
        setTemplateName(data.template?.name || "Template");
        setPagination(data.pagination);
      } catch (error) {
        console.error("Error fetching versions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [templateId]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/templates/${templateId}/edit`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Version History
          </h1>
          <p className="text-muted-foreground text-sm">
            {templateName} • {pagination.total} versions
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No versions yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Versions are created when you publish a template.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/templates/${templateId}/edit`)}
            >
              Back to Editor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {versions.map((version, index) => (
            <Card key={version.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{version.version_number}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                        })}
                      </div>

                      <p className="text-sm">
                        {version.change_summary || "Published version"}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {version.snapshot?.criteria?.length || 0} criteria
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="h-4 w-4" />
                          {version.snapshot?.groups?.length || 0} groups
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectedVersion(version)}
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Version Details Dialog */}
      <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Version {selectedVersion?.version_number} Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedVersion && (
              <div className="space-y-6 p-1">
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {format(new Date(selectedVersion.created_at), "PPP 'at' p")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pass Threshold:</span>
                    <p className="font-medium">
                      {selectedVersion.snapshot?.template?.pass_threshold || 0}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scoring Method:</span>
                    <p className="font-medium capitalize">
                      {selectedVersion.snapshot?.template?.scoring_method?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Change Summary:</span>
                    <p className="font-medium">
                      {selectedVersion.change_summary || "Published version"}
                    </p>
                  </div>
                </div>

                {/* Groups */}
                {selectedVersion.snapshot?.groups && selectedVersion.snapshot.groups.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Criteria Groups ({selectedVersion.snapshot.groups.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedVersion.snapshot.groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <Badge variant="outline" className="text-xs">
                            Group
                          </Badge>
                          <span className="text-sm">{group.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Criteria */}
                {selectedVersion.snapshot?.criteria && selectedVersion.snapshot.criteria.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Criteria ({selectedVersion.snapshot.criteria.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedVersion.snapshot.criteria.map((criterion) => (
                        <div
                          key={criterion.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <Badge variant="secondary" className="text-xs">
                            Criterion
                          </Badge>
                          <span className="text-sm">{criterion.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
