import { NextResponse } from 'next/server';
import { getPnLData, getPnLByMonthAndBranch, upsertPnLTransactions } from '@/lib/googleSheetsHelper';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    let branch = searchParams.get('branch');
    const action = searchParams.get('action');
    const refresh = searchParams.get('refresh') === 'true';

    // --- DATA MASKING ---
    const userRole = session.user?.role;
    const userBranch = session.user?.branch;
    
    // Ép cứng quyền truy cập nhánh nếu không phải Admin/Auditor
    if (userRole !== 'Admin' && userRole !== 'Auditor') {
      if (userBranch && userBranch !== 'All') {
        if (branch && branch !== 'All' && branch !== userBranch) {
          return NextResponse.json({ error: 'Forbidden: Access denied to this branch' }, { status: 403 });
        }
        branch = userBranch; // Force branch to user's branch
      }
    }
    // --------------------

    if (action === 'get_details' && month && branch) {
      const records = await getPnLByMonthAndBranch(month, branch);
      return NextResponse.json({ records });
    }

    const data = await getPnLData(month, branch, refresh);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading PnL data:', error);
    return NextResponse.json(
      { error: 'Failed to read data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.month || !body.branch || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: 'Missing required fields: month, branch, or records array' },
        { status: 400 }
      );
    }
    
    // --- DATA MASKING (WRITE) ---
    const userRole = session.user?.role;
    const userBranch = session.user?.branch;
    
    if (userRole !== 'Admin' && userRole !== 'Auditor') {
      if (userBranch && userBranch !== 'All' && body.branch !== userBranch) {
        return NextResponse.json({ error: 'Forbidden: Cannot write to this branch' }, { status: 403 });
      }
    }
    // ----------------------------
    
    const result = await upsertPnLTransactions(body.records, body.month, body.branch);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error writing PnL record:', error);
    return NextResponse.json(
      { error: 'Failed to write data', details: error.message },
      { status: 500 }
    );
  }
}
