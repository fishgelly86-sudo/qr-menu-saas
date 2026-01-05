/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
    Plus,
    Minus,
    ShoppingCart,
    BellRing,
    Star,
    Heart,
    CheckCircle2,
    X,
    Clock,
    AlertTriangle,
    Utensils, Pizza, Coffee, Soup, Salad, Beer, Wine, Flame, Cake, IceCream
} from "lucide-react";

const iconMap = {
    Utensils, Pizza, Coffee, Soup, Salad, Beer, Wine, Flame, Cake, IceCream
} as const;

type IconName = keyof typeof iconMap;

// UI Components
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { SearchBar } from "@/components/ui/SearchBar";
import { UpsellModal, UpsellItem } from "@/components/ui/UpsellModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OrderStatus } from "@/components/OrderStatus";
import { useSafeMutation } from "@/hooks/useSafeMutation";

interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    imageUrl?: string;
    modifiers?: (UpsellItem & { quantity: number })[];
}

// Mock Upsell Data removed - using real modifiers now

export default function CustomerMenuPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = params.slug as string;
    const tableParam = searchParams.get("table");
    const { t, direction, language } = useLanguage();

    const statusTranslations: Record<string, string> = {
        pending: "قيد الانتظار",
        preparing: "قيد التحضير",
        ready: "جاهز",
        served: "تم التقديم",
        paid: "مدفوع",
        cancelled: "ملغى",
    };

    const CategoryIcon = ({ iconName, className }: { iconName?: string; className?: string }) => {
        if (!iconName) return null;
        // const Icon = iconMap[iconName as IconName];
        // Safe check
        const Icon = iconMap[iconName as IconName];
        return Icon ? <Icon className={className || "w-4 h-4"} /> : null;
    };

    const getStatusLabel = (status: string) => {
        const lower = status.toLowerCase();
        if (language === 'ar' && statusTranslations[lower]) {
            return statusTranslations[lower];
        }
        const englishLabels: Record<string, string> = {
            pending: 'Order Placed',
            preparing: 'Preparing',
            ready: 'Ready',
            served: 'Served',
            paid: 'Paid',
            cancelled: 'Cancelled'
        };
        return englishLabels[lower] || status.toUpperCase();
    };

    // State
    const [tableNumber, setTableNumber] = useState<string | null>(tableParam);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [tableInput, setTableInput] = useState("");

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemNotes, setItemNotes] = useState("");

    const [showCart, setShowCart] = useState(false);
    const [showWaiterDialog, setShowWaiterDialog] = useState(false);
    const [showUpsellModal, setShowUpsellModal] = useState(false);
    const [currentUpsells, setCurrentUpsells] = useState<UpsellItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [currentOrderId, setCurrentOrderId] = useState<any>(null); // Currently viewed order
    const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]); // History of active orders

    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
        isVisible: boolean;
    }>({
        message: "",
        type: "success",
        isVisible: false,
    });

    // State for editing extras
    const [editingCartItemIndex, setEditingCartItemIndex] = useState<
        number | null
    >(null);

    const [upsellInitialQuantities, setUpsellInitialQuantities] = useState<
        Record<string, number>
    >({});

    const [idempotencyKey, setIdempotencyKey] = useState<string>("");

    useEffect(() => {
        // Generate initial key
        setIdempotencyKey(crypto.randomUUID());
    }, []);

    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Queries & Mutations
    const menu = useQuery(api.restaurants.getMenu, {
        restaurantSlug: slug,
    }) as any;
    const trackedOrder = useQuery(
        api.orders.getOrder,
        currentOrderId ? { orderId: currentOrderId } : "skip"
    );
    const activeOrders = useQuery(
        api.orders.getOrdersByIds,
        activeOrderIds.length > 0 ? { orderIds: activeOrderIds as any } : "skip"
    );
    const callWaiter = useMutation(api.waiterCalls.callWaiter);
    const createSession = useMutation(api.sessions.createTableSession);
    const refreshSession = useMutation(api.sessions.refreshSession);

    // Safe Mutation for creating orders (Offline Support)
    const { mutate: createOrderSafe, isPending: isOrderPending } = useSafeMutation(api.orders.createOrder, "orders:createOrder");


    // Security: Check Manager Status
    const managerStatus = useQuery(
        api.managers.isManagerOnline,
        menu?.restaurant?._id ? { restaurantId: menu.restaurant._id } : "skip"
    );



    // Effects
    useEffect(() => {
        const storedSessionId = localStorage.getItem("tableSessionId");
        if (storedSessionId) {
            setSessionId(storedSessionId);
        }
    }, []);

    useEffect(() => {
        if (!tableParam) {
            setShowTableSelector(true);
        } else {
            setTableNumber(tableParam);
            // If we have a table number but no session, or table changed, create/refresh session
            handleSessionInit(tableParam);
        }
    }, [tableParam, menu?.restaurant?._id]);

    const handleSessionInit = async (tNum: string) => {
        if (!menu?.restaurant?._id) return;

        let currentSId = localStorage.getItem("tableSessionId");
        if (!currentSId) {
            currentSId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        }

        try {
            const result = await createSession({
                restaurantId: menu.restaurant._id,
                tableNumber: tNum,
                sessionId: currentSId,
            });

            if (result.sessionId) {
                setSessionId(result.sessionId);
                localStorage.setItem("tableSessionId", result.sessionId);
                setSessionError(null);
            }
        } catch (error: any) {
            setSessionError(error.message);
        }
    };

    // Session expiration is now only checked when placing orders
    // This prevents the error UI from appearing during normal browsing or language changes

    // Session Heartbeat: Refresh every 5 minutes to prevent timeout
    useEffect(() => {
        if (!sessionId) return;

        const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

        const intervalId = setInterval(async () => {
            try {
                const result = await refreshSession({ sessionId });
                if (!result.success) {
                    console.warn("Session refresh failed:", result.error);
                    // Don't show error to user, they'll see it when trying to place order
                }
            } catch (error) {
                console.error("Session heartbeat error:", error);
            }
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(intervalId);
    }, [sessionId, refreshSession]);


    // Load active orders from local storage - TABLE SPECIFIC
    // This ensures orders from table 2 don't appear on table 4
    useEffect(() => {
        if (!tableNumber) return;

        const storageKey = `activeOrderIds_table_${tableNumber}`;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setActiveOrderIds(parsed);
                }
            } catch (e) {
                setActiveOrderIds([]);
            }
        } else {
            // No orders for this table yet
            setActiveOrderIds([]);
        }
    }, [tableNumber]);

    // Save active orders to local storage - TABLE SPECIFIC
    useEffect(() => {
        if (!tableNumber) return;

        const storageKey = `activeOrderIds_table_${tableNumber}`;
        localStorage.setItem(storageKey, JSON.stringify(activeOrderIds));
    }, [activeOrderIds, tableNumber]);

    // Clear cart and orders when switching to a different table
    useEffect(() => {
        if (tableNumber) {
            // Clear cart to prevent contamination from previous table
            setCart([]);
            // currentOrderId and activeOrderIds will be loaded from the new table's storage
            setCurrentOrderId(null);
        }
    }, [tableNumber]);

    // Watch for archived or cancelled orders and clean up
    useEffect(() => {
        if (activeOrders) {
            // Find orders that have been archived (cleared) by the manager
            const archivedOrders = activeOrders.filter((o: any) => o.isArchived);

            if (archivedOrders.length > 0) {
                const archivedIds = archivedOrders.map((o: any) => o._id);

                // Update local tracks to remove archived orders
                setActiveOrderIds((prev) => {
                    const newValue = prev.filter(id => !archivedIds.includes(id));
                    // Only update if changed to avoid loops
                    return newValue.length !== prev.length ? newValue : prev;
                });

                // If the currently viewed order was archived, clear it so we go back to menu
                if (currentOrderId && archivedIds.includes(currentOrderId)) {
                    setCurrentOrderId(null);
                    showToast(t("table_cleared") || "Table cleared by staff", "success");
                }
            }
        }
    }, [activeOrders, currentOrderId, t]);

    // Sync local history with valid backend orders (Optional safety check)
    useEffect(() => {
        if (activeOrders) {
            const validOrderIds = activeOrders.map((o: any) => o._id);
            // Only update if lengths differ significantly or we have ids in local that aren't in remote (and aren't just loading)
            // For now, the archive check above handles the critical "Table Clear" case.
        }
    }, [activeOrders]);

    // No auto-clear for cancelled orders - let user dismiss manually via banner

    // Handle back gesture navigation for modals
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // When we go back, the state will likely be null (or not have 'modal').
            // We should close all modals on any history navigation (back button).
            setSelectedItem(null);
            setShowUpsellModal(false);
            setShowCart(false);
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Push history state when modals open
    useEffect(() => {
        const hasModalOpen = selectedItem !== null || showUpsellModal || showCart;

        if (hasModalOpen) {
            // Only push if we haven't already pushed for this modal state
            // Check specifically for our modal flag to avoid pushing multiple times
            if (!window.history.state?.modal) {
                window.history.pushState({ modal: true }, "");
            }
        }
    }, [selectedItem, showUpsellModal, showCart]);

    // Derived State
    const cartTotal = cart.reduce((sum, item) => {
        const itemBaseTotal = item.price * item.quantity;
        const modifiersTotal =
            item.modifiers?.reduce(
                (modSum, mod) => modSum + mod.price * mod.quantity,
                0
            ) || 0;
        return sum + itemBaseTotal + modifiersTotal;
    }, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredCategories = menu?.categories
        .map((category: any) => ({
            ...category,
            items: category.items.filter(
                (item: any) =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.tags?.some((tag: string) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
            ),
        }))
        .filter((cat: any) => cat.items.length > 0);

    // Handlers
    const showToast = (
        message: string,
        type: "success" | "error" = "success"
    ) => {
        setToast({ message, type, isVisible: true });
    };

    const handleTableSubmit = () => {
        if (tableInput.trim()) {
            setTableNumber(tableInput.trim());
            setShowTableSelector(false);
            router.push(`/${slug}?table=${tableInput.trim()}`);
        }
    };

    const handleInitialAddToCart = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!selectedItem) return;

        // Check for related modifiers
        const relatedModifierIds = selectedItem.relatedModifiers || [];

        if (relatedModifierIds.length > 0 && menu.modifiers) {
            // Map IDs to modifier objects
            const specificModifiers = menu.modifiers
                .filter((mod: any) => relatedModifierIds.includes(mod._id))
                .map((mod: any) => ({
                    id: mod._id,
                    name: mod.name,
                    price: mod.price,
                    description:
                        mod.name_ar && language === "ar" ? mod.name_ar : undefined,
                }));

            if (specificModifiers.length > 0) {
                setCurrentUpsells(specificModifiers);
                setUpsellInitialQuantities({}); // Reset for new item
                setShowUpsellModal(true);
                return;
            }
        }

        // No modifiers, add directly
        addToCart();
    };

    const handleQuickAdd = (item: any, e: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const newItem: CartItem = {
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            quantity: 1,
            imageUrl: item.imageUrl,
            modifiers: [],
        };

        setCart((prev) => [...prev, newItem]);
        showToast(t("added_to_cart"), "success");
    };

    const addToCart = (upsells: (UpsellItem & { quantity?: number })[] = []) => {
        if (!selectedItem) return;

        const modifiers = upsells.map((u) => ({
            ...u,
            quantity: u.quantity || 1,
        }));

        const newItem: CartItem = {
            menuItemId: selectedItem._id,
            name: selectedItem.name,
            price: selectedItem.price,
            quantity: itemQuantity,
            notes: itemNotes,
            imageUrl: selectedItem.imageUrl,
            modifiers,
        };

        setCart((prev) => [...prev, newItem]);
        setSelectedItem(null);
        setItemQuantity(1);
        setItemNotes("");

        showToast(t("added_to_cart"), "success");
    };

    const handleConfirmUpsell = (
        upsellSelections: { id: string; quantity: number }[]
    ) => {
        const selectedUpsells = upsellSelections
            .map((selection) => {
                const original = currentUpsells.find((u) => u.id === selection.id);
                if (!original) return null;
                return { ...original, quantity: selection.quantity };
            })
            .filter(Boolean) as (UpsellItem & { quantity: number })[];

        if (editingCartItemIndex !== null) {
            // Updating existing cart item
            handleUpdateCartItemExtras(editingCartItemIndex, selectedUpsells);
        } else if (selectedItem) {
            // Adding new item
            addToCart(selectedUpsells);
        }

        setShowUpsellModal(false);
        setEditingCartItemIndex(null);
    };

    const handleEditExtras = (index: number) => {
        const item = cart[index];
        // We need to fetch the modifiers for this item again to populate the modal options
        // For simplicity, we assume we can get them from menu.modifiers using the item's ID or if we stored available modifiers
        // But the previous implementation fetched specific modifiers dynamically.
        // Ideally, we should store related modifiers on the cart item or just store the IDs.

        // Workaround: Find the item in the menu
        let originalItem: any = null;
        for (const cat of menu.categories) {
            const found = cat.items.find((i: any) => i._id === item.menuItemId);
            if (found) {
                originalItem = found;
                break;
            }
        }

        if (originalItem && originalItem.relatedModifiers && menu.modifiers) {
            const specificModifiers = menu.modifiers
                .filter((mod: any) => originalItem.relatedModifiers.includes(mod._id))
                .map((mod: any) => ({
                    id: mod._id,
                    name: mod.name,
                    price: mod.price,
                    description:
                        mod.name_ar && language === "ar" ? mod.name_ar : undefined,
                }));

            setCurrentUpsells(specificModifiers);

            // Populate initial quantities from current cart item modifiers
            const initialQty: Record<string, number> = {};
            if (item.modifiers) {
                item.modifiers.forEach((mod) => {
                    initialQty[mod.id] = mod.quantity;
                });
            }
            setUpsellInitialQuantities(initialQty);

            setEditingCartItemIndex(index);
            setShowUpsellModal(true);
        }
    };

    const handleUpdateCartItemExtras = (
        index: number,
        newModifiers: (UpsellItem & { quantity: number })[]
    ) => {
        const newCart = [...cart];
        newCart[index] = { ...newCart[index], modifiers: newModifiers };
        setCart(newCart);
        showToast(t("cart_updated"), "success");
    };

    const handleRemoveFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleUpdateCartQuantity = (index: number, delta: number) => {
        const newCart = [...cart];
        newCart[index].quantity += delta;
        if (newCart[index].quantity <= 0) {
            setCart(cart.filter((_, i) => i !== index));
        } else {
            setCart(newCart);
        }
    };

    const handleUpdateCartModifierQuantity = (
        cartIndex: number,
        modIndex: number,
        delta: number
    ) => {
        const newCart = [...cart];
        const item = newCart[cartIndex];
        if (item.modifiers && item.modifiers[modIndex]) {
            const newQuantity = (item.modifiers[modIndex].quantity || 0) + delta;

            if (newQuantity <= 0) {
                // If quantity becomes 0 or less, remove the modifier
                item.modifiers.splice(modIndex, 1);
            } else {
                item.modifiers[modIndex].quantity = newQuantity;
            }

            setCart(newCart);
        }
    };

    const handlePlaceOrder = async () => {
        if (!tableNumber || cart.length === 0 || !menu?.restaurant?._id) return;

        if (!sessionId) {
            showToast((t as any)("initializing_session") || "Initializing session... please wait.", "error");
            // Try to re-init if missing
            if (tableNumber) handleSessionInit(tableNumber);
            return;
        }

        try {
            const items = cart.map((item) => ({
                menuItemId: item.menuItemId as any,
                quantity: item.quantity,
                notes: item.notes,
                modifiers: item.modifiers?.map((m) => ({
                    modifierId: m.id,
                    quantity: m.quantity,
                })),
            }));

            // Calculate expected total for validation
            const expectedTotal = cart.reduce((sum, item) => {
                const itemBase = item.price * item.quantity;
                const mods = item.modifiers?.reduce((mSum, m) => mSum + m.price * m.quantity, 0) || 0;
                return sum + itemBase + mods;
            }, 0);

            const result = await createOrderSafe({
                restaurantId: menu.restaurant._id,
                tableNumber: tableNumber,
                sessionId: sessionId,
                items,
                idempotencyKey,
                expectedTotal, // Pass for strict validation
                customerId: undefined, // Optional, can be added if we track customers
            });

            if (result.queued) {
                setCart([]);
                setShowCart(false);
                showToast("You are offline. Order queued & will sync automatically!", "success");
                // We don't have an orderId yet, but we can clear the cart.
                // Maybe setIdempotencyKey?
                setIdempotencyKey(crypto.randomUUID());
                return;
            }

            const orderId = result.data; // result.data is the orderId from convex

            setCart([]);
            setShowCart(false);
            setCurrentOrderId(orderId); // Start tracking
            setActiveOrderIds((prev) => {
                if (prev.includes(orderId)) return prev;
                return [...prev, orderId];
            });

            // New cart = new key
            setIdempotencyKey(crypto.randomUUID());
        } catch (error: any) {
            // Check for specific error messages (Convex errors are often wrapped)
            const msg = error.message || "Failed to place order";
            if (msg.includes("Price mismatch")) {
                showToast("Menu prices have changed. Please refresh the page.", "error");
                // Optional: Trigger menu refresh
            } else {
                showToast(msg, "error");
            }
        }
    };

    const handleCallWaiter = async (type: "bill" | "help") => {
        if (!menu?.restaurant?._id || !tableNumber) return;

        try {
            await callWaiter({
                restaurantId: menu.restaurant._id,
                tableNumber: tableNumber,
                type,
            });
            setShowWaiterDialog(false);
            showToast(t("waiter_called", { type }), "success");
        } catch (error) {
            showToast(t("failed_call_waiter"), "error");
        }
    };

    const scrollToCategory = (categoryId: string) => {
        setActiveCategoryId(categoryId);
        const element = categoryRefs.current[categoryId];
        if (element) {
            const offset = 180;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    };

    if (menu === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#1a1a2e] font-serif italic">
                        {t("preparing_experience")}
                    </p>
                </div>
            </div>
        );
    }

    // Security check: Suspended or Expired
    const isSuspended = menu?.restaurant?.subscriptionStatus === "suspended";
    const isExpired = menu?.restaurant?.subscriptionExpiresAt && Date.now() > menu.restaurant.subscriptionExpiresAt;

    // Security check: Manager offline
    if (managerStatus && !managerStatus.isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0] p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto text-3xl">
                        🔒
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-[#1a1a2e]">
                        {t("restaurant_closed") || "Restaurant Closed"}
                    </h1>
                    <p className="text-gray-600">
                        {managerStatus.reason ||
                            t("manager_offline_msg") ||
                            "We are currently not accepting orders. Please check back later or ask a waiter."}
                    </p>
                </div>
            </div>
        );
    }

    // Loading state for order tracking
    if (currentOrderId && !trackedOrder) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#D4AF37] font-serif">
                        {t("loading_status") || "Loading Status..."}
                    </p>
                </div>
            </div>
        );
    }

    if (currentOrderId && activeOrders && activeOrders.length > 0) {
        return (
            <OrderStatus
                orders={activeOrders}
                tableNumber={tableNumber}
                restaurantId={menu.restaurant._id}
                onStartNewOrder={() => setCurrentOrderId(null)}
            />
        );
    }

    // Session Error UI
    if (sessionError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0] p-6 text-center">
                <div className="max-w-md space-y-4 bg-white p-8 rounded-3xl shadow-xl border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-[#1a1a2e]">
                        {(t as any)("session_error_title") || "Ordering Disabled"}
                    </h1>
                    <p className="text-gray-600">
                        {sessionError}
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full mt-4"
                    >
                        {(t as any)("retry") || "Retry"}
                    </Button>
                </div>
            </div>
        );
    }

    return isSuspended || isExpired ? (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0] p-6 text-center">
            <div className="max-w-md space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                    🚫
                </div>
                <h1 className="text-2xl font-serif font-bold text-[#1a1a2e]">
                    Restaurant Unavailable
                </h1>
                <p className="text-gray-600">
                    This restaurant is currently unavailable.
                </p>
            </div>
        </div>
    ) : (
        <div className="min-h-screen bg-[#f5f3f0] pb-24 font-sans">
            {/* 1. Fixed Header */}
            <header className="fixed top-0 left-0 right-0 bg-[#1a1a2e] shadow-lg z-40 h-[70px]">
                <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {menu.restaurant.logoUrl ? (
                            <div className="w-10 h-10 relative rounded-full overflow-hidden border border-[#D4AF37]/50">
                                <Image
                                    src={menu.restaurant.logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#1a1a2e] font-serif font-bold text-lg">
                                {menu.restaurant.name[0]}
                            </div>
                        )}
                        <div>
                            <h1 className="text-lg font-serif text-[#f5f3f0] leading-tight tracking-wide">
                                {menu.restaurant.name}
                            </h1>
                            {tableNumber && (
                                <p className="text-xs text-[#D4AF37]">
                                    {t("table_no")} {tableNumber}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setShowWaiterDialog(true)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-amber-500/30 text-amber-500 rounded-full text-sm hover:bg-amber-500/10 transition-colors"
                        >
                            <BellRing size={16} />
                            <span className="font-medium">{t("call_waiter")}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Cancelled Order Warning Banner */}
            {trackedOrder && trackedOrder.status === "cancelled" && (
                <div className="fixed top-[70px] left-0 right-0 bg-red-50 border-b-2 border-red-200 z-40 shadow-lg">
                    <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-sm font-bold text-red-800">
                                    {t("order_cancelled_title", {
                                        id: trackedOrder._id.slice(-4),
                                    })}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    {t("order_cancelled_msg")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setCurrentOrderId(null);
                                setActiveOrderIds((prev) =>
                                    prev.filter((id) => id !== trackedOrder._id)
                                );
                            }}
                            className="text-red-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-full transition-colors flex-shrink-0"
                            aria-label="Dismiss"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Sticky Search & Filter */}
            <div className="sticky top-[70px] z-30 bg-[#f5f3f0]/95 backdrop-blur-md border-b border-[#D4AF37]/10 py-4 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 space-y-4">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={t("search_placeholder")}
                    />

                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                        <div className="flex gap-3">
                            {menu.categories.map((category: any) => (
                                <button
                                    key={category._id}
                                    onClick={() => scrollToCategory(category._id)}
                                    className={`
                                        px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border flex items-center gap-2
                                        ${activeCategoryId === category._id
                                            ? "bg-[#1a1a2e] text-[#D4AF37] border-[#1a1a2e] shadow-lg shadow-[#1a1a2e]/20"
                                            : "bg-white text-[#1a1a2e]/70 border-[#D4AF37]/20 hover:border-[#D4AF37]"
                                        }
                                    `}
                                >
                                    <CategoryIcon iconName={category.icon} className="w-4 h-4" />
                                    {language === "ar" && category.name_ar ? category.name_ar : category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Menu Items Grid */}
            <main className="max-w-2xl mx-auto px-4 py-8 space-y-10 mt-[140px]">
                {filteredCategories?.map((category: any) => (
                    <div
                        key={category._id}
                        ref={(el) => {
                            categoryRefs.current[category._id] = el;
                        }}
                        className="space-y-5"
                    >
                        <h2 className="text-2xl font-serif text-[#1a1a2e] flex items-center gap-3 relative">
                            <span className="relative z-10 bg-[#f5f3f0] pr-4 flex items-center gap-2">
                                <CategoryIcon iconName={category.icon} className="w-6 h-6 text-[#D4AF37]" />
                                {language === "ar" && category.name_ar ? category.name_ar : category.name}
                            </span>
                            <div className="absolute left-0 right-0 top-1/2 h-px bg-[#D4AF37]/20 -z-0" />
                        </h2>

                        <div className="grid gap-6 sm:grid-cols-2">
                            {category.items.map((item: any) => (
                                <div
                                    key={item._id}
                                    onClick={() => {
                                        if (!item.isAvailable) return;
                                        setSelectedItem(item);
                                        setItemQuantity(1);
                                        setItemNotes("");
                                    }}
                                    className={`group bg-white rounded-2xl p-4 shadow-sm border border-[#D4AF37]/10 transition-all duration-300 relative overflow-hidden ${item.isAvailable
                                        ? "hover:shadow-xl hover:shadow-[#D4AF37]/10 cursor-pointer"
                                        : "opacity-80 cursor-not-allowed"
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        {item.imageUrl && (
                                            <div className="w-28 h-28 relative rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    fill
                                                    className={`object-cover transition-transform duration-500 ${item.isAvailable
                                                        ? "group-hover:scale-110"
                                                        : "grayscale"
                                                        }`}
                                                />
                                                {!item.isAvailable && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <span className="text-white font-bold text-xs bg-red-600 px-2 py-1 rounded transform -rotate-12">
                                                            {t("sold_out")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                                            <div>
                                                <h3 className="font-serif font-bold text-[#1a1a2e] text-lg leading-tight">
                                                    {item.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-2 font-light leading-relaxed">
                                                    {language === "ar" && item.description_ar
                                                        ? item.description_ar
                                                        : item.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="font-serif font-bold text-[#D4AF37] text-lg">
                                                    {"DA"} {item.price.toFixed(2)}
                                                </span>
                                                <div
                                                    onClick={(e) => {
                                                        if (item.isAvailable) {
                                                            handleQuickAdd(item, e);
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shadow-lg shadow-[#1a1a2e]/20 ${item.isAvailable
                                                        ? "bg-[#1a1a2e] text-[#D4AF37] hover:scale-110 active:scale-95"
                                                        : "bg-gray-200 text-gray-400"
                                                        }`}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="absolute top-3 left-3 flex gap-1">
                                        {item.tags?.includes("Spicy") && (
                                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                                                {t("spicy")}
                                            </span>
                                        )}
                                        {Math.random() > 0.7 && (
                                            <span className="bg-[#D4AF37] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                {t("chefs_special")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </main>

            {/* 4. Fixed Bottom Cart Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-30 max-w-2xl mx-auto">
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#c4a027] text-[#1a1a2e] p-4 rounded-2xl flex items-center justify-between hover:scale-[1.02] transition-all duration-300 animate-glow"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-[#1a1a2e] text-[#D4AF37] px-3 py-1 rounded-lg font-bold text-sm shadow-inner">
                                {cartItemCount} {t("items")}
                            </div>
                            <span className="font-serif font-bold">{t("view_order")}</span>
                        </div>
                        <span className="font-serif font-bold text-xl">
                            {"DA"} {cartTotal.toFixed(2)}
                        </span>
                    </button>
                </div>
            )}

            {/* Floating Status Pill (only if cart is empty and we have active orders) */}
            {cart.length === 0 && activeOrders && activeOrders.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-50 max-w-2xl mx-auto flex justify-end">
                    <button
                        onClick={() =>
                            setCurrentOrderId(activeOrders[activeOrders.length - 1]?._id)
                        }
                        className="bg-[#1a1a2e] text-[#D4AF37] px-4 py-3 rounded-full shadow-xl border border-[#D4AF37]/30 flex items-center gap-3 hover:scale-105 transition-transform animate-bounce-slow"
                        style={{ zIndex: 9999 }}
                    >
                        <Clock className="w-5 h-5" />
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                                {t("active_order")}
                            </span>
                            <span className="font-bold text-sm leading-none">
                                {(() => {
                                    const lastOrder = activeOrders[activeOrders.length - 1];
                                    return lastOrder?.status
                                        ? getStatusLabel(lastOrder.status)
                                        : "";
                                })()}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {/* 5. Cart Drawer */}
            <Drawer
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                title={`${t("your_order")} (${cartItemCount} ${t("items")})`}
            >
                <div className="space-y-6 pb-40">
                    {cart.map((item, index) => (
                        <div
                            key={index}
                            className={`flex gap-4 py-6 ${index !== cart.length - 1 ? "border-b border-gray-100" : ""
                                }`}
                        >
                            {item.imageUrl && (
                                <div className="w-24 h-24 relative rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-serif font-bold text-[#1a1a2e] text-lg leading-tight pr-4">
                                            {item.name}
                                        </h3>
                                        <span className="text-sm text-gray-500 whitespace-nowrap">
                                            DA {item.price.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Main Item Quantity Control */}
                                    <div className="flex items-center gap-4 mt-2 mb-3">
                                        <span className="text-gray-500 text-sm font-medium">
                                            {t("quantity") || "Qty"}:
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleUpdateCartQuantity(index, -1)}
                                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#D4AF37]/10 text-gray-600 hover:text-[#D4AF37] transition-colors disabled:opacity-50"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-[#1a1a2e] text-lg">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => handleUpdateCartQuantity(index, 1)}
                                                className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center hover:bg-[#c4a027] text-white shadow-md shadow-[#D4AF37]/20 transition-all hover:scale-105"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modifiers List with Quantity Controls */}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <div className="space-y-2 mt-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                            {item.modifiers.map((mod, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between pl-2 border-l-2 border-gray-100"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-600">
                                                            {mod.name}
                                                        </span>
                                                        <span className="text-xs text-[#D4AF37]">
                                                            +{mod.price} DA
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateCartModifierQuantity(index, i, -1)
                                                            }
                                                            className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#D4AF37]/10 text-gray-400 hover:text-[#D4AF37] transition-colors"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-4 text-center font-bold text-sm text-[#1a1a2e]">
                                                            {mod.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateCartModifierQuantity(index, i, 1)
                                                            }
                                                            className="w-6 h-6 rounded-full bg-[#D4AF37]/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-white text-[#D4AF37] transition-all"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {item.notes && (
                                        <p className="text-sm text-gray-500 mt-2 italic pl-2 border-l-2 border-yellow-200/50">
                                            "{item.notes}"
                                        </p>
                                    )}

                                    {/* Line Total */}
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                        <span className="text-sm font-medium text-gray-600">
                                            Line Total:
                                        </span>
                                        <span className="font-bold text-[#D4AF37] text-lg">
                                            DA{" "}
                                            {(
                                                item.price * item.quantity +
                                                (item.modifiers?.reduce(
                                                    (sum, m) => sum + m.price * m.quantity,
                                                    0
                                                ) || 0)
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4">
                                    <button
                                        onClick={() => handleRemoveFromCart(index)}
                                        className="px-3 py-1 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        {t("remove")}
                                    </button>
                                    <button
                                        onClick={() => handleEditExtras(index)}
                                        className="px-3 py-1 rounded-lg text-sm font-medium text-amber-600 border border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                                    >
                                        {item.modifiers && item.modifiers.length > 0
                                            ? t("edit_extras") || "Edit Extras"
                                            : t("add_extras") || "Add Extras"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {cart.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-500 font-serif">
                                {t("total_amount")}
                            </span>
                            <span className="text-3xl font-serif font-bold text-[#1a1a2e]">
                                {"DA"} {cartTotal.toFixed(2)}
                            </span>
                        </div>
                        <Button
                            onClick={handlePlaceOrder}
                            disabled={!tableNumber || isOrderPending}
                            className="w-full h-14 text-lg font-serif tracking-wide animate-glow transition-all"
                        >
                            {isOrderPending
                                ? "Processing..."
                                : (tableNumber ? t("confirm_order") : t("select_table_first"))}
                        </Button>
                    </div>
                )}
            </Drawer>

            {/* 6. Waiter Modal */}
            <Modal
                isOpen={showWaiterDialog}
                onClose={() => setShowWaiterDialog(false)}
                title={t("concierge_service")}
            >
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => handleCallWaiter("bill")}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-[#f5f3f0] border border-transparent hover:border-[#D4AF37] hover:bg-white hover:shadow-lg transition-all group"
                    >
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                            💳
                        </span>
                        <div
                            className={`text-left ${direction === "rtl" ? "text-right" : ""}`}
                        >
                            <div className="font-serif font-bold text-[#1a1a2e]">
                                {t("request_bill")}
                            </div>
                            <div className="text-xs text-gray-500">
                                {t("ready_to_settle")}
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => handleCallWaiter("help")}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-[#f5f3f0] border border-transparent hover:border-[#D4AF37] hover:bg-white hover:shadow-lg transition-all group"
                    >
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                            🛎️
                        </span>
                        <div
                            className={`text-left ${direction === "rtl" ? "text-right" : ""}`}
                        >
                            <div className="font-serif font-bold text-[#1a1a2e]">
                                {t("call_server")}
                            </div>
                            <div className="text-xs text-gray-500">
                                {t("general_assistance")}
                            </div>
                        </div>
                    </button>
                </div>
            </Modal>

            {/* Table Selector Modal */}
            <Modal isOpen={showTableSelector} onClose={() => { }} title={t("welcome")}>
                <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                    <p className="text-gray-600 font-serif">{t("enter_table_number")}</p>
                    <Input
                        type="text"
                        value={tableInput}
                        onChange={(e) => setTableInput(e.target.value)}
                        placeholder={t("table_no")}
                        className="text-center text-lg font-serif tracking-widest border-[#D4AF37]/30 focus-visible:ring-[#D4AF37]"
                        autoFocus
                    />
                    <Button
                        onClick={handleTableSubmit}
                        disabled={!tableInput.trim()}
                        className="w-full"
                    >
                        {t("begin_dining")}
                    </Button>
                </div>
            </Modal>

            {/* Item Detail Modal */}
            <Drawer
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                title={t("item_details")}
                headerContent={
                    selectedItem && (
                        <div className="space-y-6 pb-4 pt-2">
                            {selectedItem.imageUrl && (
                                <div className="w-full h-64 relative rounded-2xl overflow-hidden shadow-2xl">
                                    <Image
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <h2 className="text-3xl font-serif font-bold">
                                            {selectedItem.name}
                                        </h2>
                                    </div>
                                </div>
                            )}

                            {!selectedItem.imageUrl && (
                                <h2 className="text-3xl font-serif font-bold text-[#1a1a2e] px-2">
                                    {selectedItem.name}
                                </h2>
                            )}

                            <div className="flex items-center justify-between border-b border-gray-100 pb-6 px-2">
                                <span className="text-3xl font-serif font-bold text-[#D4AF37]">
                                    {selectedItem.price.toFixed(2)} DA
                                </span>
                                <div
                                    className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setItemQuantity(Math.max(1, itemQuantity - 1))
                                        }
                                        className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-xl font-bold w-8 text-center text-[#1a1a2e]">
                                        {itemQuantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setItemQuantity(itemQuantity + 1)}
                                        className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center hover:bg-[#c4a027] transition-colors text-white shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                footer={
                    selectedItem && (
                        <Button
                            type="button"
                            onClick={handleInitialAddToCart}
                            className="w-full h-14 text-lg font-serif tracking-wide animate-glow"
                        >
                            {t("add_to_order")} •{" "}
                            {(selectedItem.price * itemQuantity).toFixed(2)} DA
                        </Button>
                    )
                }
            >
                {selectedItem && (
                    <div className="space-y-8 pb-4">
                        {(selectedItem.description ||
                            (language === "ar" && selectedItem.description_ar)) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
                                        {t("description")}
                                    </label>
                                    <p className="text-gray-700 leading-relaxed">
                                        {language === "ar" && selectedItem.description_ar
                                            ? selectedItem.description_ar
                                            : selectedItem.description}
                                    </p>
                                </div>
                            )}

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
                                {t("special_instructions")}
                            </label>
                            <textarea
                                value={itemNotes}
                                onChange={(e) => setItemNotes(e.target.value)}
                                placeholder={t("allergies_placeholder")}
                                className="w-full p-4 rounded-xl bg-gray-50 border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37] min-h-[100px] resize-none text-[#1a1a2e]"
                            />
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Upsell Modal */}
            <UpsellModal
                isOpen={showUpsellModal}
                onClose={() => setShowUpsellModal(false)}
                upsellItems={currentUpsells}
                initialQuantities={upsellInitialQuantities}
                onConfirm={handleConfirmUpsell}
            />
        </div>
    );
}
