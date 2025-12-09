import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/components/ui/Toast";
import { Save } from "lucide-react";

interface CreateMenuItemFormProps {
    restaurantId: string;
    onSuccess?: () => void;
    // Optional: Pre-fill for edit mode roughly (though this is "Create" form)
    defaultCategoryId?: string;
}

export function CreateMenuItemForm({ restaurantId, onSuccess, defaultCategoryId }: CreateMenuItemFormProps) {
    const createItem = useMutation(api.menuItems.createMenuItem);
    const categories = useQuery(api.categories.getCategoriesByRestaurant, { restaurantId: restaurantId as any });
    const { showToast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        imageStorageId: "",
        imageUrl: "", // Just for display in ImageUpload if needed, though ImageUpload handles its own preview
        categoryId: defaultCategoryId || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.categoryId) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        if (!formData.imageStorageId) {
            showToast("Please upload an image for the menu item", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await createItem({
                restaurantId: restaurantId as any,
                categoryId: formData.categoryId as any,
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                imageStorageId: formData.imageStorageId as any,
                isAvailable: true,
                tags: [],
            });

            showToast("Menu item created!", "success");
            setFormData({
                name: "",
                description: "",
                price: "",
                imageStorageId: "",
                imageUrl: "",
                categoryId: defaultCategoryId || "",
            });
            onSuccess?.();
        } catch (err) {
            console.error(err);
            showToast("Failed to create item", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!categories) return <div>Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create Menu Item</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <Input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Signature Burger"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (DA) *</label>
                        <Input
                            required
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                            required
                            className="w-full h-12 px-4 py-2.5 rounded-lg bg-white border border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] text-black"
                            value={formData.categoryId}
                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                            <option value="">Select a category...</option>
                            {categories.map((cat: any) => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] text-black p-3 min-h-[100px]"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the item..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
                        <ImageUpload
                            onImageUpload={(storageId, url) => {
                                setFormData({
                                    ...formData,
                                    imageStorageId: storageId,
                                    imageUrl: url
                                });
                            }}
                            currentImageUrl={formData.imageUrl}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#D4AF37] hover:bg-[#c4a027] text-white"
                    >
                        {isSubmitting ? "Creating..." : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Create Item
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
