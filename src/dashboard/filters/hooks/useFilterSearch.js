import { useEffect, useState } from "react";

import { useDebounce } from "../../../shared/hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";

export function useFilterSearch(fieldKey, value, delay = 250) {
    const [searchValue, setSearchValue] = useState(value ?? "");
    const debouncedSearch = useDebounce(searchValue, delay);
    const setSearch = useFilterStore((state) => state.setSearch);

    useEffect(() => {
        setSearch(fieldKey, debouncedSearch);
    }, [debouncedSearch, fieldKey, setSearch]);

    return [searchValue, setSearchValue];
}