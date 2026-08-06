import { SampleDetail } from "@/components/SampleDetail";

export default async function AdminSampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SampleDetail
      sampleId={id}
      backHref="/admin/inventory"
      canDelete={true}
    />
  );
}