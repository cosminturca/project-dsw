import TaskBoard from "./components/TaskBoard";
import Login from "./pages/Login";
import { TasksProvider } from "./context/TasksContext";
import { useAuth } from "./context/useAuth";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <TasksProvider>
      <TaskBoard />
    </TasksProvider>
  );
}

export default function App() {
  return <AppContent />;
}
