import React from "react";

function AuthForm({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}) {
  return (
    <div className="auth-card">
      <div className="auth-mode-toggle">
        <button
          type="button"
          className={
            "btn btn-small " + (mode === "login" ? "btn-primary" : "btn-ghost")
          }
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={
            "btn btn-small " + (mode === "signup" ? "btn-primary" : "btn-ghost")
          }
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="form">
        <div className="form-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-success">
          {loading ? "Loading..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
    </div>
  );
}

export default AuthForm;