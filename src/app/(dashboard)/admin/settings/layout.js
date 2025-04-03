import { SettingsSidebar } from "./components/settings-sidebar"

export const metadata = {
  title: "Settings",
  description: "Manage your application settings and preferences.",
}

export default function SettingsLayout({ children }) {
  return (
    <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] py-8">
      <aside className="hidden w-[200px] flex-col md:flex">
        <SettingsSidebar />
      </aside>
      <main className="flex w-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}

