import { Route, Switch } from "wouter";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminDatabasePage } from "@/pages/admin/AdminDatabasePage";
import { AdminProfilesPage } from "@/pages/admin/AdminProfilesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";

export function AdminApp() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AdminLayout>
          <Switch>
            <Route path="/users" component={AdminUsersPage} />
            <Route path="/profiles" component={AdminProfilesPage} />
            <Route path="/database" component={AdminDatabasePage} />
            <Route path="/" component={AdminDashboardPage} />
          </Switch>
        </AdminLayout>
      </RequireAdmin>
    </RequireAuth>
  );
}
