// Lead-first flow: Step 1 (Name/Number/Email) -> Step 2 duplicate check -> Step 3 confirm
// -> Step 4 service-type unlock. See docs/TECHNICAL_SPEC.md §5 "Leads" and the PRD §4.
export default function NewLeadPage() {
  return <p className="text-sm text-neutral-500">New lead — lead-first flow — Phase 2.</p>;
}
