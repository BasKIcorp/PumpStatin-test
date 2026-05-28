import { Route, Switch } from "wouter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { WizardPage } from "@/pages/WizardPage";
import { CabinetPage } from "@/pages/CabinetPage";
import { StrelaLoginPage } from "@/pages/StrelaLoginPage";
import { ADMIN_PATH_PATTERN, AdminApp } from "@/pages/admin/AdminApp";

export default function App() {
  return (
    <Switch>
      <Route path={ADMIN_PATH_PATTERN}>
        <AdminApp />
      </Route>
      <Route path="/login" component={StrelaLoginPage} />
      <Route path="/cabinet">
        <RequireAuth>
          <ProfileProvider>
            <CabinetPage />
          </ProfileProvider>
        </RequireAuth>
      </Route>
      <Route path="/">
        <RequireAuth>
          <ProfileProvider>
            <WizardPage />
          </ProfileProvider>
        </RequireAuth>
      </Route>
    </Switch>
  );
}
