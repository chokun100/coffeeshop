import { authHandler } from "@/lib/auth";
import { NextResponse } from "next/server";

export const { GET, POST } = authHandler;
