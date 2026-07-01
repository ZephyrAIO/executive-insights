import { useCallback, useState } from "react";

export function useFilterPopoverOrder() {
    const [isOpen, setIsOpen] = useState(false);
    const [preserveOrder, setPreserveOrder] = useState(false);
    const [refreshRevision, setRefreshRevision] = useState(0);

    const handleOpenChange = useCallback((open) => {
        setIsOpen(open);
        setPreserveOrder(open);

        if (!open) {
            setRefreshRevision((currentRevision) => currentRevision + 1);
        }
    }, []);

    return {
        handleOpenChange,
        isOpen,
        preserveOrder,
        refreshRevision,
    };
}