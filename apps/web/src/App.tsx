import { Route, Switch } from "wouter";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { WizardPage } from "@/pages/WizardPage";
import { StrelaLoginPage } from "@/pages/StrelaLoginPage";
import { AdminApp } from "@/pages/admin/AdminApp";

export default function App() {
  return (
    <Switch>
      <Route path="/admin" nest>
        <AdminApp />
      </Route>
      <Route path="/login" component={StrelaLoginPage} />
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
