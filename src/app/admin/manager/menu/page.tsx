"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Image as ImageIcon, ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { useToast } from "@/components/ui/Toast";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useRestaurant } from "../RestaurantContext";

function AdminItemImage({ item }: { item: any }) {
    const getImageUrl = useAction(api.files.getImageUrl);
    const [url, setUrl] = useState<string | null>(item.imageUrl || null);

    useEffect(() => {
        if (item.imageStorageId) {
            getImageUrl({ storageId: item.imageStorageId })
                .then(u => u && setUrl(u))
                .catch(e => console.error(e));
        } else {
            setUrl(item.imageUrl || null);
        }
    }, [item.imageStorageId, item.imageUrl, getImageUrl]);

    if (!url) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon className="w-8 h-8" />
            </div>
        );
    }

    return <Image src={url} alt={item.name} fill className="object-cover" />;
}

// Debug and Claim components removed as per user request to simplify.



import { useLanguage } from "@/contexts/LanguageContext";

export default function MenuManager() {
    // 1. Get restaurant from Context
    const { restaurant } = useRestaurant();
    const { t } = useLanguage();
    const restaurantSlug = restaurant?.slug;

    const menu = useQuery(api.restaurants.getAdminMenu, restaurantSlug ? { restaurantSlug } : "skip");
    const trash = useQuery(api.restaurants.getTrashItems, restaurantSlug ? { restaurantSlug } : "skip");

    const updateItem = useMutation(api.menuItems.updateMenuItem);
    const createItem = useMutation(api.menuItems.createMenuItem);
    const toggleAvailability = useMutation(api.menuItems.markItemAvailability);
    const deleteItem = useMutation(api.menuItems.deleteMenuItem);
    const undoDeleteItem = useMutation(api.menuItems.undoDeleteMenuItem);

    const createCategory = useMutation(api.categories.createCategory);
    const deleteCategory = useMutation(api.categories.deleteCategory);
    const undoDeleteCategory = useMutation(api.categories.undoDeleteCategory);

    const createModifier = useMutation(api.modifiers.createModifier);
    const updateModifier = useMutation(api.modifiers.updateModifier);
    const deleteModifier = useMutation(api.modifiers.deleteModifier);
    const toggleModAvailability = useMutation(api.modifiers.toggleModifierAvailability);

    const [editingItem, setEditingItem] = useState<any>(null);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isModifiersOpen, setIsModifiersOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [categoryName, setCategoryName] = useState("");
    const { showToast } = useToast();

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    // Modifier Form State
    const [modifierForm, setModifierForm] = useState({ id: "", name: "", name_ar: "", price: "" });
    const [isEditingModifier, setIsEditingModifier] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        description_ar: "",
        price: "",
        imageUrl: "",
        imageStorageId: "",
        categoryId: "",
        relatedModifiers: [] as string[]
    });

    if (menu === undefined) return <div className="p-8 text-center text-gray-500">Loading menu...</div>;

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            description_ar: item.description_ar || "",
            price: item.price.toString(),
            imageUrl: item.imageUrl || "",
            imageStorageId: item.imageStorageId || "",
            categoryId: item.categoryId,
            relatedModifiers: item.relatedModifiers || []
        });
    };

    const handleSave = async () => {
        if (editingItem) {
            await updateItem({
                itemId: editingItem._id,
                name: formData.name,
                description: formData.description,
                description_ar: formData.description_ar || undefined,
                price: parseFloat(formData.price),
                imageUrl: formData.imageUrl || undefined,
                imageStorageId: formData.imageStorageId ? (formData.imageStorageId as any) : undefined,
                relatedModifiers: formData.relatedModifiers as any
            });
            setEditingItem(null);
        } else if (isAddingItem) {
            if (!menu.restaurant) return;
            await createItem({
                restaurantId: menu.restaurant._id,
                categoryId: formData.categoryId as any,
                name: formData.name,
                description: formData.description,
                description_ar: formData.description_ar || undefined,
                price: parseFloat(formData.price),
                imageUrl: formData.imageUrl || undefined,
                imageStorageId: formData.imageStorageId ? (formData.imageStorageId as any) : undefined,
                isAvailable: true,
                tags: [],
                relatedModifiers: formData.relatedModifiers as any
            });
            setIsAddingItem(false);
        }
        // Reset form
        setFormData({ name: "", description: "", description_ar: "", price: "", imageUrl: "", imageStorageId: "", categoryId: "", relatedModifiers: [] });
    };

    const handleSaveModifier = async () => {
        if (isEditingModifier && modifierForm.id) {
            await updateModifier({
                modifierId: modifierForm.id as any,
                name: modifierForm.name,
                name_ar: modifierForm.name_ar || undefined,
                price: parseFloat(modifierForm.price)
            });
        } else {
            if (!menu.restaurant) return;
            await createModifier({
                restaurantId: menu.restaurant._id,
                name: modifierForm.name,
                name_ar: modifierForm.name_ar || undefined,
                price: parseFloat(modifierForm.price)
            });
        }
        setModifierForm({ id: "", name: "", name_ar: "", price: "" });
        setIsEditingModifier(false);
    };

    const handleDeleteModifier = async (id: string) => {
        if (confirm("Delete this modifier?")) {
            await deleteModifier({ modifierId: id as any });
        }
    };

    const handleToggleAvailability = async (item: any) => {
        await toggleAvailability({
            itemId: item._id,
            isAvailable: !item.isAvailable
        });
    };

    const handleDeleteItem = async (item: any) => {
        await deleteItem({ itemId: item._id });

        showToast(t("item_deleted"), "success", (
            <button
                onClick={() => undoDeleteItem({ itemId: item._id })}
                className="bg-white text-gray-900 px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
            >
                {t("undo")}
            </button>
        ));
    };

    const handleDeleteCategory = async (category: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(t("cancel_order_confirm"))) {
            await deleteCategory({ categoryId: category._id });

            showToast(t("category_deleted"), "success", (
                <button
                    onClick={() => undoDeleteCategory({ categoryId: category._id })}
                    className="bg-white text-gray-900 px-2 py-1 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                    {t("undo")}
                </button>
            ));
        }
    };

    // Filter menu based on search query
    const filteredCategories = menu.categories.map((category: any) => {
        const filteredItems = category.items.filter((item: any) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        return {
            ...category,
            items: filteredItems
        };
    }).filter((category: any) => category.items.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white shadow sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("menu")}</h1>
                            {/* Search Bar */}
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={t("search_items") || "Search items..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-64 text-black placeholder:text-gray-500 border-gray-300"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {/* Mobile Search Bar */}
                            <div className="relative sm:hidden w-full mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={t("search_items") || "Search items..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-full text-black placeholder:text-gray-500 border-gray-300"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 items-center justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsModifiersOpen(true)}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none"
                                >
                                    <Edit className="w-4 h-4 mr-2 ml-2" />
                                    {t("modifiers")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsTrashOpen(true)}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none"
                                >
                                    <Trash2 className="w-4 h-4 mr-2 ml-2" />
                                    {t("trash")}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                                >
                                    <Plus className="w-4 h-4 mr-2 ml-2" />
                                    {t("category")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <Accordion type="multiple" className="w-full space-y-4" value={searchQuery ? filteredCategories.map((c: any) => c._id) : undefined}>
                    {filteredCategories.map((category: any) => (
                        <AccordionItem key={category._id} value={category._id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6">
                            <AccordionTrigger className="hover:no-underline py-6 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" hideChevron>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                    <h2 className="text-xl font-bold text-gray-800 text-left">{category.name}</h2>
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                                        {category.items.length} {t("items")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto pl-9 sm:pl-0">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAddingItem(true);
                                            setFormData(prev => ({ ...prev, categoryId: category._id }));
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setIsAddingItem(true);
                                                setFormData(prev => ({ ...prev, categoryId: category._id }));
                                            }
                                        }}
                                        className="inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer flex-1 sm:flex-none"
                                    >
                                        <Plus className="w-4 h-4 mr-2 ml-2" />
                                        {t("add_item")}
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => handleDeleteCategory(category, e)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Category"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pt-4 pb-6 divide-y divide-gray-100">
                                    {category.items.map((item: any) => (
                                        <div key={item._id} className="py-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 hover:bg-gray-50 transition-colors group rounded-lg px-2 sm:px-4 -mx-2 sm:-mx-4">
                                            {/* Image */}
                                            <div className="w-full sm:w-24 h-48 sm:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-200">
                                                <AdminItemImage item={item} />
                                                {!item.isAvailable && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold px-2 py-1 bg-red-500 rounded">SOLD OUT</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 w-full min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                                                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-lg font-bold text-[#D4AF37]">
                                                            {item.price.toFixed(2)} DA
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditClick(item)}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 sm:flex-none"
                                                    >
                                                        <Edit className="w-4 h-4 mr-1 ml-1" />
                                                        {t("edit")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleToggleAvailability(item)}
                                                        className={`flex-1 sm:flex-none ${item.isAvailable ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                                                    >
                                                        {item.isAvailable ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-1 ml-1" />
                                                                {t("unavailable")}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-1 ml-1" />
                                                                {t("available")}
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteItem(item)}
                                                        className="text-red-400 border-red-200 hover:bg-red-50 hover:text-red-600"
                                                        title={t("delete")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {category.items.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 italic">
                                            No items in this category yet.
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </main>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={!!editingItem || isAddingItem}
                onClose={() => {
                    setEditingItem(null);
                    setIsAddingItem(false);
                }}
                title={editingItem ? t("edit_item") : t("add_new_item")}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Classic Burger"
                            className="text-black placeholder:text-gray-500 border-gray-300"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("description")}</label>
                        <textarea
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] text-black placeholder:text-gray-500"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the item..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("description_ar_label")}</label>
                        <textarea
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] text-black placeholder:text-gray-500 text-right"
                            rows={3}
                            dir="rtl"
                            value={formData.description_ar}
                            onChange={e => setFormData({ ...formData, description_ar: e.target.value })}
                            placeholder="وصف المنتج..."
                        />
                        <p className="text-xs text-gray-500 mt-1">{t("auto_translate_msg")}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("price")} (DA)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                placeholder="0.00"
                                className="text-black placeholder:text-gray-500 border-gray-300"
                            />
                        </div>
                        {isAddingItem && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("category")}</label>
                                <select
                                    className="w-full h-12 px-4 py-2.5 rounded-lg bg-white border-gray-300 shadow-sm focus:border-[#D4AF37] focus:ring-[#D4AF37] text-black"
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    {menu.categories.map((cat: any) => (
                                        <option key={cat._id} value={cat._id} className="text-black">{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <ImageUpload
                            currentImageUrl={formData.imageUrl}
                            onImageUpload={(storageId, url) => setFormData({ ...formData, imageStorageId: storageId, imageUrl: url })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("related_modifiers")}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                            {menu.modifiers?.map((mod: any) => (
                                <label key={mod._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.relatedModifiers.includes(mod._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData({ ...formData, relatedModifiers: [...formData.relatedModifiers, mod._id] });
                                            } else {
                                                setFormData({ ...formData, relatedModifiers: formData.relatedModifiers.filter(id => id !== mod._id) });
                                            }
                                        }}
                                        className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                                    />
                                    <span className="text-sm text-gray-700">{mod.name} (+{mod.price} DA)</span>
                                </label>
                            ))}
                            {(!menu.modifiers || menu.modifiers.length === 0) && (
                                <p className="text-sm text-gray-500 col-span-2 text-center py-2">No modifiers created yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setEditingItem(null);
                                setIsAddingItem(false);
                            }}
                        >
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleSave} className="bg-[#D4AF37] text-white hover:bg-[#c4a027]">
                            <Save className="w-4 h-4 mr-2" />
                            {t("save_changes")}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Trash Modal */}
            <Modal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title={t("trash")}
            >
                <div className="space-y-6">
                    {!trash || (trash.items.length === 0 && trash.categories.length === 0) ? (
                        <div className="text-center py-8 text-gray-500">
                            <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t("trash_empty")}</p>
                        </div>
                    ) : (
                        <>
                            {trash.categories.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3">{t("deleted_categories")}</h3>
                                    <div className="space-y-2">
                                        {trash.categories.map((cat: any) => (
                                            <div key={cat._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="font-medium text-gray-700">{cat.name}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => undoDeleteCategory({ categoryId: cat._id })}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                                >
                                                    {t("restore")}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {trash.items.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3">{t("deleted_items")}</h3>
                                    <div className="space-y-2">
                                        {trash.items.map((item: any) => (
                                            <div key={item._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden relative">
                                                        <AdminItemImage item={item} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{item.name}</p>
                                                        <p className="text-xs text-gray-500">{item.price.toFixed(2)} DA</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => undoDeleteItem({ itemId: item._id })}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                                >
                                                    {t("restore")}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Modal>

            {/* Modifiers Management Modal */}
            <Modal
                isOpen={isModifiersOpen}
                onClose={() => setIsModifiersOpen(false)}
                title={t("manage_modifiers")}
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900">{isEditingModifier ? t("edit_modifier") : t("add_new_modifier")}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                placeholder="Name (e.g. Extra Cheese)"
                                value={modifierForm.name}
                                onChange={e => setModifierForm({ ...modifierForm, name: e.target.value })}
                                className="text-black placeholder:text-gray-500 border-gray-300"
                            />
                            <Input
                                placeholder="Arabic Name (Optional)"
                                value={modifierForm.name_ar}
                                onChange={e => setModifierForm({ ...modifierForm, name_ar: e.target.value })}
                                className="text-black placeholder:text-gray-500 border-gray-300 text-right"
                                dir="rtl"
                            />
                            <Input
                                type="number"
                                placeholder="Price (DA)"
                                value={modifierForm.price}
                                onChange={e => setModifierForm({ ...modifierForm, price: e.target.value })}
                                className="text-black placeholder:text-gray-500 border-gray-300"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleSaveModifier} className="flex-1 bg-[#D4AF37] text-white hover:bg-[#c4a027]">
                                    {isEditingModifier ? t("update" as any) || "Update" : t("add" as any) || "Add"}
                                </Button>
                                {isEditingModifier && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditingModifier(false);
                                            setModifierForm({ id: "", name: "", name_ar: "", price: "" });
                                        }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">{t("existing_modifiers")}</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {menu.modifiers?.map((mod: any) => (
                                <div key={mod._id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                                    <div>
                                        <p className={`font-medium ${mod.isAvailable === false ? "text-gray-400 line-through" : "text-gray-900"}`}>{mod.name}</p>
                                        <p className="text-xs text-gray-500">{mod.price} DA</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleModAvailability({ modifierId: mod._id, isAvailable: mod.isAvailable === false })}
                                            className={mod.isAvailable === false ? "text-green-600 hover:bg-green-50" : "text-orange-500 hover:bg-orange-50"}
                                            title={mod.isAvailable === false ? t("make_available") || "Make Available" : t("make_unavailable") || "Make Unavailable"}
                                        >
                                            {mod.isAvailable === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setModifierForm({
                                                    id: mod._id,
                                                    name: mod.name,
                                                    name_ar: mod.name_ar || "",
                                                    price: mod.price.toString()
                                                });
                                                setIsEditingModifier(true);
                                            }}
                                            className="text-blue-600 hover:bg-blue-50"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteModifier(mod._id)}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {(!menu.modifiers || menu.modifiers.length === 0) && (
                                <p className="text-center text-gray-500 py-4">No modifiers found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Add Category Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => {
                    setIsCategoryModalOpen(false);
                    setCategoryName("");
                }}
                title={t("add_new_category")}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("category_name")}</label>
                        <Input
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                            placeholder="e.g. Appetizers, Main Courses, Desserts"
                            className="text-black placeholder:text-gray-500 border-gray-300"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsCategoryModalOpen(false);
                                setCategoryName("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!categoryName.trim()) {
                                    showToast(t("enter_category_name_error"), "error");
                                    return;
                                }
                                if (!menu.restaurant) return;

                                // Calculate next rank
                                const maxRank = menu.categories.reduce((max: number, cat: any) =>
                                    Math.max(max, cat.rank || 0), 0
                                );

                                await createCategory({
                                    restaurantId: menu.restaurant._id,
                                    name: categoryName,
                                    rank: maxRank + 1
                                });

                                showToast(t("category_created_success"), "success");
                                setIsCategoryModalOpen(false);
                                setCategoryName("");
                            }}
                            className="bg-[#D4AF37] text-white hover:bg-[#c4a027]"
                        >
                            {t("create_category")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
