import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PlanManagement from "./pages/PlanManagement";
import Recommendation from "./pages/Recommendation";
import QueryRecommendation from "./pages/QueryRecommendation";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/plans"} component={PlanManagement} />
      <Route path={"/recommend"} component={Recommendation} />
      <Route path={"/query"} component={() => <QueryRecommendation />} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
