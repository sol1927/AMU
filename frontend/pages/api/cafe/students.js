// API route for cafe users to fetch their student list

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift().trim()] = decodeURIComponent(parts.join("="));
  });
  return list;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse cookies to get JWT and cafeNumber
  const cookies = parseCookies(req.headers.cookie || "");
  const accessToken = cookies.accessToken;
  const cafeNumber = req.query.cafeNumber;

  if (!accessToken || !cafeNumber) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Forward request to backend
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  // You may need to get the campusId from the user's session or profile
  // For now, assume campusId is in cookies (set this up as needed)
  const campusId = cookies.campusId;
  if (!campusId) {
    return res.status(400).json({ message: "Campus ID not found" });
  }

  const url = `${backendUrl}/dashboard/campuses/${campusId}/students?cafeNumber=${cafeNumber}`;

  const response = await fetch(url, {
    headers: {
      Cookie: `accessToken=${accessToken}`,
    },
    credentials: "include",
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
