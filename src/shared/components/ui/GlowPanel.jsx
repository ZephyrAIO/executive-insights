function callHandler(handler, event) {
    if (typeof handler === "function") {
        handler(event);
    }
}

export default function GlowPanel({
    as: Component = "div",
    children,
    className = "",
    onPointerEnter,
    onPointerLeave,
    onPointerMove,
    ...props
}) {
    const handlePointerEnter = (event) => {
        event.currentTarget.style.setProperty("--spotlight-opacity", "1");
        callHandler(onPointerEnter, event);
    };

    const handlePointerLeave = (event) => {
        event.currentTarget.style.setProperty("--spotlight-opacity", "0");
        callHandler(onPointerLeave, event);
    };

    const handlePointerMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
        callHandler(onPointerMove, event);
    };

    return (
        <Component
            className={["glow-panel", className].filter(Boolean).join(" ")}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
            {...props}
        >
            {children}
        </Component>
    );
}
