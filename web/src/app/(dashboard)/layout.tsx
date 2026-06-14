import { SidebarNav } from "@/components/sidebar-nav";
import { Header } from "@/components/header";
import { ChatSidebar } from "@/components/chat-sidebar";
import { PageviewTracker } from "@/components/pageview-tracker";
import { ViewAsProvider } from "@/lib/view-as";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewAsProvider>
      <div className="flex min-h-screen">
        <PageviewTracker />
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <Header />
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
        <ChatSidebar />
      </div>
    </ViewAsProvider>
  );
}
