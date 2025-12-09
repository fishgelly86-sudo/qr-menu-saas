import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Image as ImageIcon } from "lucide-react";

interface MenuItemCardProps {
    item: {
        name: string;
        price: number;
        imageStorageId?: string;
        imageUrl?: string; // Fallback for old items
        description?: string;
    };
}

export function MenuItemCard({ item }: MenuItemCardProps) {
    const getImageUrl = useAction(api.files.getImageUrl);
    const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl || null);

    useEffect(() => {
        if (item.imageStorageId) {
            getImageUrl({ storageId: item.imageStorageId as any })
                .then((url) => {
                    if (url) setImageUrl(url);
                })
                .catch((err) => console.error("Failed to load image", err));
        } else if (item.imageUrl) {
            setImageUrl(item.imageUrl);
        }
    }, [item.imageStorageId, item.imageUrl, getImageUrl]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="relative h-48 w-full bg-gray-100">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                    <span className="font-bold text-[#D4AF37] whitespace-nowrap">
                        {item.price.toFixed(2)} DA
                    </span>
                </div>
                {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-auto">
                        {item.description}
                    </p>
                )}
            </div>
        </div>
    );
}
