import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SiteProvider } from "@/lib/site";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Cabinet from "@/pages/Cabinet";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login">
        <Redirect to="/account" />
      </Route>
      <Route path="/register" component={Register} />
      {/* Единый личный кабинет — для обычных пользователей и администраторов */}
      <Route path="/account" component={Cabinet} />
      {/* Обратная совместимость: старый маршрут перенаправляет на /account */}
      <Route path="/app-admin">
        <Redirect to="/account" />
      </Route>
      {/* Мультисайт: /<slug> и /<slug>/* открывают Home; SiteProvider определит slug из URL. */}
      <Route path="/:siteSlug" component={Home} />
      <Route path="/:siteSlug/:rest*" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SiteProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
