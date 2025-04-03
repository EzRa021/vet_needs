import { ThemeSetting } from "./theme-setting"


export const dynamic = 'force-static'
export default function ThemePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Theme Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the application.
        </p>
      </div>
      <ThemeSetting />
    </div>
  )
}

