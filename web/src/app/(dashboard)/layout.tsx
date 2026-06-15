import { PageviewTracker } from "@/components/pageview-tracker";
import { ViewAsProvider } from "@/lib/view-as";
import { AppFrame } from "@/components/app-frame";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewAsProvider>
      <PageviewTracker />
      <AppFrame>{children}</AppFrame>
    </ViewAsProvider>
  );
}
