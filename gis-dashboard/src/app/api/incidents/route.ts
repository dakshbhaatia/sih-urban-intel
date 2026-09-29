import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://nfklnhtjpwfafgkibomj.supabase.co/rest/v1/incidents?select=*&order=created_at.desc&limit=40";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ma2xuaHRqcHdmYWZna2lib21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODczMzcsImV4cCI6MjEwNDI2MzMzN30.LMKigY8fRh-46oF8LVMPyTXU0kgDpJMsLT4nM_a_5RA";

  try {
    const res = await fetch(url, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText, incidents: [] }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ incidents: Array.isArray(data) ? data : [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, incidents: [] }, { status: 200 });
  }
}