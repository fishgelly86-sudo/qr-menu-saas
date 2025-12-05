import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        const variants = {
            primary: "bg-[#D4AF37] text-[#1a1a2e] hover:bg-[#c4a027] shadow-md shadow-[#D4AF37]/20",
            secondary: "bg-[#1a1a2e] text-[#D4AF37] hover:bg-[#151525] shadow-md shadow-[#1a1a2e]/20",
            outline: "border-2 border-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10 text-[#1a1a2e]",
            ghost: "bg-transparent hover:bg-[#1a1a2e]/5 text-[#1a1a2e]",
            danger: "bg-red-600 text-white hover:bg-red-700",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 py-2",
            lg: "h-12 px-6 text-lg",
            icon: "h-10 w-10 p-2 flex items-center justify-center",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, cn };
