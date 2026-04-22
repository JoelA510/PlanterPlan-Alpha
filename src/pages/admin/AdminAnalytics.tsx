// Wave 34 Task 3 implementation lives here. Task 1 scaffolds a placeholder so
// the /admin/analytics route resolves; Task 3's commit replaces this body
// with the real AdminAnalytics + useAdminAnalytics wiring.

export default function AdminAnalytics() {
    return (
        <div className="p-8" data-testid="admin-analytics">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Analytics dashboard lands in Wave 34 Task 3.
            </p>
        </div>
    );
}
