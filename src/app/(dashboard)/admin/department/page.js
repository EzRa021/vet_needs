import ManageDepartments from "@/components/admin/branch/DepartmentTable";


export const dynamic = 'force-static'
export default function DepartmentPage() {
  return (
    <div className=" m-4">
      <ManageDepartments />
    </div>
  );
}

