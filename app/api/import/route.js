import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { batchUpsertPnLTransactions } from '@/lib/googleSheetsHelper';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Bạn cần đăng nhập để thực hiện' }, { status: 401 });
    }

    const userRole = session.user.role || 'Viewer';
    const userBranch = session.user.branch;

    if (userRole === 'Viewer') {
      return NextResponse.json({ error: 'Forbidden: Bạn chỉ có quyền Xem (Viewer), không thể Import dữ liệu' }, { status: 403 });
    }

    const body = await request.json();
    const { month, branches, records, fileName, sheetName } = body;

    // Validate request
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Tháng không hợp lệ (định dạng chuẩn YYYY-MM)' }, { status: 400 });
    }

    if (!Array.isArray(branches) || branches.length === 0) {
      return NextResponse.json({ error: 'Danh sách cơ sở rỗng' }, { status: 400 });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Không có bản ghi dữ liệu nào để lưu' }, { status: 400 });
    }

    // Role-based branch authorization
    let allowedBranches = branches;
    let allowedRecords = records;

    if (userRole !== 'Admin' && userRole !== 'Auditor') {
      // Editor is restricted to their assigned branch
      if (userBranch && userBranch !== 'All') {
        const forbiddenBranches = branches.filter(b => b !== userBranch);
        if (forbiddenBranches.length > 0) {
          // If the editor has records from multiple branches, only process their branch
          allowedBranches = [userBranch];
          allowedRecords = records.filter(r => r.branch === userBranch);
          if (allowedRecords.length === 0) {
            return NextResponse.json({
              error: `Forbidden: Bạn chỉ có quyền quản trị cơ sở [${userBranch}]. File không chứa dữ liệu của cơ sở này.`
            }, { status: 403 });
          }
        }
      }
    }

    const result = await batchUpsertPnLTransactions(
      allowedRecords,
      month,
      allowedBranches,
      session.user.email,
      fileName || 'import.xlsx',
      sheetName || ''
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during batch import:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lưu dữ liệu vào Google Sheets', details: error.message },
      { status: 500 }
    );
  }
}
