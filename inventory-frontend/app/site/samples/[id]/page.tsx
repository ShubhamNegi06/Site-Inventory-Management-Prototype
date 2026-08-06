import { SampleDetail } from "@/components/SampleDetail";

export default function SiteSampleDetailPage({ params }: { params: { id: string } }) {
  return <SampleDetail sampleId={params.id} backHref="/site/inventory" canDelete={false} />;
}
