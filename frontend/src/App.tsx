import TaskBoard from "./components/TaskBoard";
import { TasksProvider } from "./context/TasksContext";

export default function App() {
  return (
    <TasksProvider>
      <TaskBoard />
    </TasksProvider>
  );
}
