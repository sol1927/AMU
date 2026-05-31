// Next.js API route to proxy campus cafe managers CRUD to backend
export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  let targetUrl = backendUrl + "/campus/cafe-managers";
  if (
    (req.method === "PATCH" || req.method === "DELETE") &&
    (req.query.id || req.body?.id)
  ) {
    targetUrl += `/${req.query.id || req.body?.id}`;
  }

  const headers = { ...req.headers };
  // Remove host header to avoid issues
  delete headers.host;
  // Always set content-type for POST/PATCH
  if (req.method === "POST" || req.method === "PATCH") {
    headers["content-type"] = "application/json";
  }

  // Forward cookies for authentication
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie;
  }

  const options = {
    method: req.method,
    headers,
    credentials: "include",
    // Don't set body for GET/DELETE
    ...(req.method === "POST" || req.method === "PATCH"
      ? { body: JSON.stringify(req.body) }
      : {}),
  };

  try {
    const response = await fetch(targetUrl, options);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    // Forward set-cookie headers from backend to client
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ message: "Proxy error", error: err.message });
  }
}
