import { ChevronDown, LoaderCircle } from "lucide-react";

export default function FilterTrigger({ label, loading = false, disabled = false, ref, ...props }) {
    return (
        <button className="dashboard-filter-trigger" disabled={disabled} ref={ref} type="button" {...props}>
            <span>{label}</span>
            {loading ? <LoaderCircle aria-hidden="true" className="dashboard-filter-icon is-spinning" /> : null}
            <ChevronDown aria-hidden="true" className="dashboard-filter-icon" />
        </button>
    );
}