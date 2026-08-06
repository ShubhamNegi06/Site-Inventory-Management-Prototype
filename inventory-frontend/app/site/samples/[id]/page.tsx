import { SampleDetail } from "@/components/SampleDetail";

export default async function SiteSampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SampleDetail
      sampleId={id}
      backHref="/site/inventory"
      canDelete={true}
    />
  );
}
