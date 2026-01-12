import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  async function login() {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  }

  async function register() {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
      <div className="w-80 bg-slate-900/70 border dark:border-slate-800 text-white p-6 rounded-3xl shadow-lg space-y-4">
        <h1 className="text-2xl font-bold text-center">Login</h1>

        {error && (
          <div className="text-sm text-red-600 text-center">{error}</div>
        )}

        {/* Email */}
        <input
          className="w-full bg-slate-900/70 border dark:border-slate-800 dark:bg-slate-950 p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative">
          <input
            className="w-full bg-slate-900/70 border dark:border-slate-800 dark:bg-slate-950 p-2 rounded pr-10"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-white-800"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Login */}
        <button
          onClick={login}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          Login
        </button>

        {/* Register */}
        <button
          onClick={register}
          className="w-full bg-black hover:bg-gray-900 text-white py-2 rounded"
        >
          Register
        </button>
      </div>
    </div>
  );
}
