import { Route, Router, Switch } from "wouter";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminDatabasePage } from "@/pages/admin/AdminDatabasePage";
import { AdminProfilesPage } from "@/pages/admin/AdminProfilesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";

/** Все URL под /admin (включая /admin и /admin/users). */
export const ADMIN_PATH_PATTERN = /^\/admin(?:\/.*)?$/;

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/users" component={AdminUsersPage} />
      <Route path="/profiles" component={AdminProfilesPage} />
      <Route path="/database" component={AdminDatabasePage} />
      <Route path="/" component={AdminDashboardPage} />
      {/* /admin без хвоста — scoped path может быть пустым */}
      <Route component={AdminDashboardPage} />
    </Switch>
  );
}

export function AdminApp() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <Router base="/admin">
          <AdminLayout>
            <AdminRoutes />
          </AdminLayout>
        </Router>
      </RequireAdmin>
    </RequireAuth>
  );
}
