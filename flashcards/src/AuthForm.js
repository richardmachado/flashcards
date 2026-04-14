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
  onForgotPassword,
  forgotMessage,
}) {
  const isSignup = mode === "signup";

  return (
    <div className="auth-flip-scene">
      <div className={`auth-flip-card ${isSignup ? "flipped" : ""}`}>
        <div className="auth-face auth-front">
          <form className="auth-card" onSubmit={onSubmit}>
            <div
              className="auth-mode-toggle"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                className={`auth-mode-btn ${!isSignup ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                className={`auth-mode-btn ${isSignup ? "active" : ""}`}
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </div>

            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtext">Log in to keep studying.</p>

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="error-text">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Loading..." : "Log in"}
            </button>

            <button
              type="button"
              className="auth-switch"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>

            {forgotMessage && (
              <div
                className="success-text"
                style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}
              >
                {forgotMessage}
              </div>
            )}  
          </form>
        </div>

        <div className="auth-face auth-back">
          <form className="auth-card" onSubmit={onSubmit}>
            <div
              className="auth-mode-toggle"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                className={`auth-mode-btn ${!isSignup ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                className={`auth-mode-btn ${isSignup ? "active" : ""}`}
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </div>

            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtext">Start studying in minutes.</p>

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="error-text">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Loading..." : "Sign up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
