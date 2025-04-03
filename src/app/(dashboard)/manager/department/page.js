import ManageDepartments from "@/components/manager/branch/DepartmentTable";


export const dynamic = 'force-static'
export default function DepartmentPage() {
  return (
    <div className=" mx-4">
      <ManageDepartments />
    </div>
  );
}

