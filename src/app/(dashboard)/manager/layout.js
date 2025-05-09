import { AppSidebar } from "@/components/manager/layout/app-sidebar"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DepartmentProvider } from '@/context/DepartmentContext';
import { CategoryProvider } from '@/context/CategoryContext';
// import { AllBranchItemProvider } from '@/context/AllBranchItemContext';
import { ItemProvider } from '@/context/ItemContext';
import { CartProvider } from "@/context/CartContext";
import { TransactionProvider } from "@/context/TransactionContext";
import { ReturnsProvider } from "@/context/manager/ReturnContext";
import { ExpensesProvider } from "@/context/manager/ExpensesContext";
import { LogProvider } from "@/context/manager/LogContext";
import { ReportProvider } from "@/context/manager/ReportContext";
// import { WaybillProvider } from "@/context/ManagerWaybillContext";
import { ExpensesProvider as ExpensesProvide} from "@/context/ExpensesContext";
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
                <ExpensesProvide>
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
              </ExpensesProvide>
              </CartProvider>
            </ItemProvider>
            </UserProvider>
          {/* </AllBranchItemProvider> */}
        </CategoryProvider>
      </DepartmentProvider>
    </LogProvider>
  )
}
