"use client";
import { useState, useEffect } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // icons

export default function AddCampusModal({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // modal error state
  const [showPassword, setShowPassword] = useState(false); // toggle state

  // Clear error after 2 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 2000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // clear previous error
    const errMessage = await onSubmit({ name, location, email, password });
    if (errMessage) setError(errMessage); // show error inside modal
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-[400px] flex flex-col gap-4"
      >
        <h3 className="text-lg font-bold">Add Campus</h3>

        {/* Error message inside modal */}
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <input
          className="border p-2 rounded"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password input with show/hide */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="border p-2 rounded w-full pr-10"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
