/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { Plus, QrCode, Trash2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/components/ui/Toast";
import { useRestaurant } from "../layout";

export default function TablesPage() {
  const { restaurant } = useRestaurant();
  const restaurantSlug = restaurant?.slug;

  const tables = useQuery(
    api.tables.getTablesByRestaurant,
    restaurant ? { restaurantId: restaurant._id } : "skip",
  ) as any;

  const createTable = useMutation(api.tables.createTable);
  const deleteTable = useMutation(api.tables.deleteTable);
  const updateTableStatus = useMutation(api.tables.updateTableStatus);
  const resetAllTables = useMutation(api.tables.resetAllTables);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  const { showToast } = useToast();

  if (!restaurant || !tables)
    return <div className="p-8">Loading Tables...</div>;

  // Sort tables by number (numeric sort)
  const sortedTables = [...tables].sort((a, b) => {
    // Try to parse as numbers
    const numA = parseInt(a.number);
    const numB = parseInt(b.number);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // Fallback to string comparison
    return a.number.localeCompare(b.number);
  });

  const handleCreateTable = async () => {
    if (!newTableNumber) return;
    try {
      await createTable({
        restaurantId: restaurant._id,
        number: newTableNumber,
        qrCodeUrl: `https://my-qr-app.com/${restaurantSlug}?table=${newTableNumber}`, // Placeholder
      });
      setIsModalOpen(false);
      setNewTableNumber("");
      showToast("Table created successfully", "success");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        showToast(`Table ${newTableNumber} already exists!`, "error");
      } else {
        showToast("Failed to create table", "error");
      }
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (confirm(`Are you sure you want to delete Table ${tableNumber}?`)) {
      await deleteTable({ tableId: tableId as any });
      showToast("Table deleted", "success");
    }
  };

  const handleResetAllTables = async () => {
    if (
      confirm(
        "Are you sure you want to reset all tables to FREE? This will archive all active orders.",
      )
    ) {
      const result = await resetAllTables({ restaurantId: restaurant._id });
      showToast(`${result.count} tables reset to free`, "success");
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: string) => {
    await updateTableStatus({
      tableId: tableId as any,
      status: newStatus as any,
    });
    showToast("Table status updated", "success");
  };

  const handleShowQR = (table: any) => {
    setSelectedTable(table);
    setQrModalOpen(true);
  };

  const downloadQR = () => {
    const canvas = document.getElementById(
      "qr-code-canvas",
    ) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `table-${selectedTable.number}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tables & QR
          </h1>
          <p className="text-sm text-gray-500">Manage your layout</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Button
            onClick={handleResetAllTables}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-600 hover:bg-orange-50 shrink-0 flex-1 sm:flex-none"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Table
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedTables.map((table: any) => (
          <div
            key={table._id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center relative group"
          >
            <div
              className={`absolute top-4 right-4 w-3 h-3 rounded-full ${table.status === "free"
                  ? "bg-green-500"
                  : table.status === "occupied"
                    ? "bg-red-500"
                    : table.status === "dirty"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
              title={table.status}
            />

            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-gray-700">
              {table.number}
            </div>

            <div className="w-full mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 text-center">
                Status
              </label>
              <select
                value={table.status}
                onChange={(e) => handleStatusChange(table._id, e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${table.status === "free"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : table.status === "occupied"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : table.status === "dirty"
                        ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                        : "border-blue-300 bg-blue-50 text-blue-700"
                  }`}
              >
                <option value="free">Free</option>
                <option value="occupied">Occupied</option>
                <option value="dirty">Dirty</option>
                <option value="payment_pending">Payment Pending</option>
              </select>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleShowQR(table)}
              >
                <QrCode className="w-4 h-4 mr-2" /> QR Code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-600"
                onClick={() => handleDeleteTable(table._id, table.number)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Table Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Table"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Table Number
            </label>
            <Input
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="e.g. 12 or A1"
              autoFocus
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} disabled={!newTableNumber}>
              Create Table
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`Table ${selectedTable?.number} QR Code`}
      >
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
            {selectedTable && (
              <QRCodeCanvas
                id="qr-code-canvas"
                value={`${window.location.origin}/${restaurantSlug}?table=${selectedTable.number}`}
                size={256}
                level={"H"}
                includeMargin={true}
              />
            )}
          </div>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Scan this code to open the menu directly for Table{" "}
            {selectedTable?.number}.
          </p>
          <Button onClick={downloadQR} className="w-full">
            <Download className="w-4 h-4 mr-2" /> Download PNG
          </Button>
        </div>
      </Modal>
    </div>
  );
}
