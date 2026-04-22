// Wave 34 Task 2 implementation lives here. Task 1 scaffolds a placeholder so
// the /admin/users route resolves; Task 2's commit replaces this body with
// the real AdminUsers + useAdminUsers wiring.

export default function AdminUsers() {
    return (
        <div className="p-8" data-testid="admin-users">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Detailed user-management table lands in Wave 34 Task 2.
            </p>
        </div>
    );
}
