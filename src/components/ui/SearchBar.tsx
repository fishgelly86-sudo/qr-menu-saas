import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "./Input";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-10 border-[#D4AF37]/30 focus-visible:ring-[#D4AF37] bg-white/80 backdrop-blur-sm"
            />
        </div>
    );
}
