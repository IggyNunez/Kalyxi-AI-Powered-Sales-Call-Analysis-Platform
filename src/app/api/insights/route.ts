import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await db.insight.findMany({
      where: {
        call: {
          userId: session.user.id,
        },
      },
      orderBy: [
        { importance: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        call: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
