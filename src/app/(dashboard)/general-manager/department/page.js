import ManageDepartments from "@/components/general-manager/branch/DepartmentTable";


export const dynamic = 'force-static'
export default function DepartmentPage() {
  return (
    <div className=" mx-4">
      <ManageDepartments />
    </div>
  );
}

