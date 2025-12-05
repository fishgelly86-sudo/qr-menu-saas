import AdminSidebar from "@/components/AdminSidebar";

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
