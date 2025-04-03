import { AppSidebar } from "@/components/admin/layout/app-sidebar"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DepartmentProvider } from '@/context/DepartmentContext';
import { CategoryProvider } from '@/context/CategoryContext';
// import { AllBranchItemProvider } from '@/context/AllBranchItemContext';
import { ItemProvider } from '@/context/ItemContext';
import { CartProvider } from "@/context/CartContext";
import { TransactionProvider } from "@/context/TransactionContext";
import { ReturnsProvider } from "@/context/ReturnContext";
import { ExpensesProvider } from "@/context/ExpensesContext";
import { LogProvider } from "@/context/LogContext";
import { ReportProvider } from "@/context/ReportContext";
// import { WaybillProvider } from "@/context/WaybillContext";
import { UserProvider } from "@/context/UserContext";
export default function Layout({ children }) {
  return (


    <LogProvider>
      <DepartmentProvider>
        <CategoryProvider>
          {/* <AllBranchItemProvider> */}
            <UserProvider>
              <ItemProvider>
                <CartProvider>
                  <ExpensesProvider>
                    <TransactionProvider>
                      <ReturnsProvider>


                        <ReportProvider>
                          {/* <WaybillProvider> */}
                            <SidebarProvider>
                              <AppSidebar />
                              <SidebarInset className="border border-border dark:border-sidebar-border">
                                <div className="">
                                  {children}
                                </div>
                              </SidebarInset>
                            </SidebarProvider>
                          {/* </WaybillProvider> */}
                        </ReportProvider>



                        {/* </SummaryProvider> */}
                      </ReturnsProvider>
                    </TransactionProvider>
                  </ExpensesProvider >
                </CartProvider>

              </ItemProvider>
            </UserProvider>
          {/* </AllBranchItemProvider> */}
        </CategoryProvider>
      </DepartmentProvider>
    </LogProvider>
  )
}
