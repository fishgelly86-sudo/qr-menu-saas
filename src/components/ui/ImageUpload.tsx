import { useState, useRef } from "react";
import Image from "next/image";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "./Button";
import imageCompression from "browser-image-compression";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ImageUploadProps {
    onImageUpload: (storageId: string, imageUrl: string) => void;
    label?: string;
    disabled?: boolean;
    currentImageUrl?: string; // Optional prop to show existing image if needed
}

export function ImageUpload({
    onImageUpload,
    label = "📷 Upload Image",
    disabled = false,
    currentImageUrl
}: ImageUploadProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const getImageUrl = useAction(api.files.getImageUrl);
    const logMetadata = useMutation(api.files.logImageMetadata);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProgress(10);
        setError(null);

        try {
            // 1. Compression
            const options = {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: "image/jpeg",
                initialQuality: 0.75
            };

            setProgress(20);
            const compressedFile = await imageCompression(file, options);
            setProgress(40);

            // 2. Get Upload URL
            const postUrl = await generateUploadUrl();
            setProgress(50);

            // 3. POST to Convex
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": compressedFile.type },
                body: compressedFile,
            });

            if (!result.ok) throw new Error("Upload failed");

            setProgress(70);
            const { storageId } = await result.json();

            // 4. Get display URL
            const imageUrl = await getImageUrl({ storageId });
            if (!imageUrl) throw new Error("Failed to get image URL");

            setProgress(90);
            setPreviewUrl(imageUrl);

            // 5. Notify Parent
            onImageUpload(storageId, imageUrl);

            // Optional: Log metadata
            try {
                await logMetadata({
                    storageId,
                    fileName: file.name,
                    originalSize: file.size,
                    compressedSize: compressedFile.size,
                });
            } catch (err) {
                console.warn("Failed to log metadata", err);
            }

            setProgress(100);
        } catch (err) {
            console.error(err);
            setError("Failed to upload image. Please try again.");
            setPreviewUrl(null);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setPreviewUrl(null);
        // We pass empty strings to clear
        onImageUpload("", "");
    };

    return (
        <div className="space-y-4">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={disabled || isProcessing}
            />

            {previewUrl ? (
                <div className="relative w-full max-w-sm h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                    <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">

                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleRemove}
                            className="h-10 w-10 p-2 rounded-full"
                            disabled={disabled || isProcessing}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
                    className={`
                        flex flex-col items-center justify-center w-full max-w-sm p-6 
                        border-2 border-dashed rounded-lg transition-colors cursor-pointer
                        ${error ? "border-red-300 bg-red-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
                        ${(disabled || isProcessing) ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                >
                    {isProcessing ? (
                        <div className="space-y-2 text-center py-4">
                            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
                            <p className="text-sm font-medium text-gray-600">
                                {progress < 40 ? "Compressing..." :
                                    progress < 80 ? "Uploading..." : "Finalizing..."}
                            </p>
                            <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
                                <div
                                    className="h-full bg-[#D4AF37] transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 text-center">
                            <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center rounded-full bg-white border border-gray-200">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <div className="text-sm text-gray-500">
                                <p className="font-medium text-gray-700">{label}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    {error}
                </div>
            )}

            <p className="text-xs text-gray-400 max-w-sm">
                Automatically compressed to ~300–600KB (75% quality). Supports JPEG, PNG, WebP, up to 40MP.
            </p>
        </div>
    );
}
