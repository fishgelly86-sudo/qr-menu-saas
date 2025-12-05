import Link from "next/link";
import { ArrowRight, QrCode, Smartphone, Utensils } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-8 h-8 text-amber-500" />
            <span className="text-xl font-bold text-gray-900">QR Menu SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Admin Login
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
              Modernize Your Restaurant with <span className="text-amber-500">QR Menus</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Create beautiful, digital menus in minutes. Contactless ordering, real-time updates, and seamless customer experience.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/admin"
                className="px-8 py-4 text-lg font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                Create Your Menu <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant QR Codes</h3>
              <p className="text-gray-600">Generate unique QR codes for each table. Customers scan to view menu and order instantly.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile Optimized</h3>
              <p className="text-gray-600">Beautiful, responsive menus that look great on any device. No app download required.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Utensils className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Easy Management</h3>
              <p className="text-gray-600">Update items, prices, and availability in real-time from your admin dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"// Deployment Trigger 01"
