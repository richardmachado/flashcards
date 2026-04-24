const { supabase } = require("../config/supabase");

async function getRequestUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("Missing token");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid token");
  }

  return { user, token };
}

module.exports = getRequestUser;