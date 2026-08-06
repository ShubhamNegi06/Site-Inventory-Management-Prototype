import { SampleDetail } from "@/components/SampleDetail";

export default function AdminSampleDetailPage({ params }: { params: { id: string } }) {
  return <SampleDetail sampleId={params.id} backHref="/admin/inventory" canDelete={true} />;
}
