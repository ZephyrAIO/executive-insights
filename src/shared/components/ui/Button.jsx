export default function Button({
    children,
    className = "",
    tone = "primary",
    variant = "solid",
    type = "button",
    ...props
}) {
    const buttonClassName = ["ui-button", `ui-button--${tone}`, `ui-button--${variant}`, className]
        .filter(Boolean)
        .join(" ");

    return (
        <button className={buttonClassName} type={type} {...props}>
            {children}
        </button>
    );
}
