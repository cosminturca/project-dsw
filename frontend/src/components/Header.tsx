import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Cloud } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header({ syncOk }: { syncOk: boolean }) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <header
      className="w-full px-6 py-4 flex items-center justify-between
                       bg-slate-950 border-b border-slate-800"
    >
      {/* STÂNGA: user + sync */}
      <div className="flex items-center gap-4 text-sm text-slate-200">
        <span>
          Conectat ca{" "}
          <strong className="text-white">
            {user?.displayName || user?.email}
          </strong>
        </span>

        {/* SYNC */}
        <span
          className="inline-flex items-center gap-2 rounded-full
                         bg-slate-900 px-3 py-1 text-xs font-semibold"
        >
          <Cloud className="h-4 w-4" />
          <span
            className={`h-2 w-2 rounded-full ${
              syncOk ? "bg-green-500" : "bg-slate-500"
            }`}
          />
          {syncOk ? "SYNC READY" : "OFFLINE"}
        </span>
      </div>

      {/* DREAPTA: sign out */}
      <button
        onClick={handleSignOut}
        className="rounded-lg px-4 py-2 text-sm font-semibold
                   bg-red-600 text-white hover:bg-red-700 transition"
      >
        Sign out
      </button>
    </header>
  );
}
