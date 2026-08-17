// Lead detail: status badge, masked PII with Reveal buttons, booking module tabs.
// Phase 3 (booking modules) / Phase 7 (masking + reveal) in the delivery plan.
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <p className="text-sm text-neutral-500">Lead {id} — Phase 3/7.</p>;
}
