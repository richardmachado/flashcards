import React, { useEffect, useMemo, useState } from "react";

function AdminPage({ token, API_URL, onBack }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [last24h, setLast24h] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_URL}/auth/admin/users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load admin users");
        }

        setUsers(Array.isArray(data.users) ? data.users : []);
        setTotal(data.total || 0);
        setLast24h(data.last24h || 0);
      } catch (err) {
        setError(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadUsers();
    }
  }, [token, API_URL]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email || "").toLowerCase().includes(q));
  }, [users, search]);

  const nullEmailCount = users.filter((u) => !u.email).length;

  return (
    <div className="card-block">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.25rem" }}>
            Admin dashboard
          </h2>
          <div className="muted-text">Recent signups and user overview</div>
        </div>

        <button type="button" className="btn btn-gray" onClick={onBack}>
          Back
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div className="deck-card">
          <div className="muted-text" style={{ fontSize: "0.85rem" }}>
            Users shown
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{total}</div>
        </div>

        <div className="deck-card">
          <div className="muted-text" style={{ fontSize: "0.85rem" }}>
            New in 24h
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{last24h}</div>
        </div>

        <div className="deck-card">
          <div className="muted-text" style={{ fontSize: "0.85rem" }}>
            Missing emails
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {nullEmailCount}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "320px" }}
        />
      </div>

      {loading && <div className="muted-text">Loading users...</div>}
      {error && <div className="error-text">{error}</div>}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Pro</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}>{u.email || "NULL"}</td>
                  <td style={tdStyle}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td style={tdStyle}>{u.is_pro ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{u.is_admin ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    {u.email ? (
                      <span style={{ color: "#2e7d32", fontWeight: 600 }}>
                        OK
                      </span>
                    ) : (
                      <span style={{ color: "#c62828", fontWeight: 600 }}>
                        Missing email
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "1px solid #ddd",
  fontSize: "0.9rem",
};

const tdStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid #eee",
  fontSize: "0.95rem",
};

export default AdminPage;