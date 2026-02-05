import { UploadForm } from "@/components/calls/upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Call</h1>
        <p className="text-gray-500">
          Upload a sales call recording for AI-powered analysis
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
