import { Search } from "lucide-react";

export default function FilterSearch({ value, onChange, placeholder }) {
    return (
        <label className="dashboard-filter-search">
            <Search aria-hidden="true" className="dashboard-filter-search-icon" />
            <input
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                type="search"
                value={value}
            />
        </label>
    );
}