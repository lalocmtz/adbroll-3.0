import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardFooter from "@/components/DashboardFooter";
import PreviewBanner from "@/components/PreviewBanner";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Preview Banner removed */}
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Mobile menu button only */}
          <div className="lg:hidden sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <DashboardFooter />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;