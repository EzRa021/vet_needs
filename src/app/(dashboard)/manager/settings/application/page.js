import { ApplicationSetting } from "./application-setting"


export const dynamic = 'force-static'
export default function ApplicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Application Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure application-wide settings.
        </p>
      </div>
      <ApplicationSetting />
    </div>
  )
}

