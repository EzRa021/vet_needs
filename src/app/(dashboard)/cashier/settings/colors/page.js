import { ColorSetting } from "./color-setting"


export const dynamic = 'force-static'
export default function ColorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Color Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize the color scheme of the application.
        </p>
      </div>
      <ColorSetting />
    </div>
  )
}

