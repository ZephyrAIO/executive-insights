import { Popover } from "radix-ui";

import FilterTrigger from "./FilterTrigger.jsx";

export default function FilterPopover({ children, disabled = false, label, loading = false, onOpenChange, open }) {
    return (
        <Popover.Root onOpenChange={onOpenChange} open={open}>
            <Popover.Trigger asChild>
                <FilterTrigger disabled={disabled} label={label} loading={loading} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="start" className="dashboard-filter-popover" sideOffset={8}>
                    {children}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}