import { NextResponse } from 'next/server';
import { getUserByEmail, updateUserPin } from '@/lib/googleSheetsHelper';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, pin, oldPin, newPin } = body;

    const dbUser = await getUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Default PIN if none is set in the Google Sheet is '123456' for testing/first time
    const actualPin = dbUser.pin || '123456';

    if (action === 'verify') {
      if (pin === actualPin) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: 'Sai mã PIN' }, { status: 401 });
      }
    }

    if (action === 'change') {
      if (oldPin !== actualPin) {
        return NextResponse.json({ success: false, error: 'Mã PIN cũ không đúng' }, { status: 401 });
      }
      if (!newPin || newPin.length !== 6 || !/^\d+$/.test(newPin)) {
        return NextResponse.json({ success: false, error: 'Mã PIN mới phải gồm 6 chữ số' }, { status: 400 });
      }

      const result = await updateUserPin(session.user.email, newPin);
      if (result.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in PIN API:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
