"use client";

import { createContext, useContext } from "react";

export interface RestaurantContextType {
    restaurant: any;
    isLoading: boolean;
}

export const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function useRestaurant() {
    const context = useContext(RestaurantContext);
    if (!context) {
        throw new Error("useRestaurant must be used within a RestaurantProvider (ManagerLayout)");
    }
    return context;
}
