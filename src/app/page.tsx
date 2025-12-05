/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const restaurants = useQuery(api.restaurants.listRestaurants) as any;

  if (restaurants === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            QR Menu System
          </h1>
          <p className="text-lg text-gray-600">
            Select a restaurant to view their menu
          </p>
        </div>

        {restaurants.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No restaurants found.</p>
            <p className="text-sm text-gray-500">
              Run the seed data function to create demo restaurants.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant: any) => (
              <Link
                key={restaurant._id}
                href={`/${restaurant.slug}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center text-center group"
              >
                {restaurant.logoUrl && (
                  <div className="w-20 h-20 relative rounded-full overflow-hidden mb-4 bg-gray-100">
                    <Image
                      src={restaurant.logoUrl}
                      alt={restaurant.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {restaurant.name}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  /{restaurant.slug}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
