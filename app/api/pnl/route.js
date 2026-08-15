import { NextResponse } from 'next/server';
import { getPnLData, getPnLByMonthAndBranch, upsertPnLTransactions } from '@/lib/googleSheetsHelper';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const branch = searchParams.get('branch');
    const action = searchParams.get('action');

    // Nếu request yêu cầu lấy chi tiết của 1 Tháng & Cơ sở (để fill form Edit)
    if (action === 'get_details' && month && branch) {
      const records = await getPnLByMonthAndBranch(month, branch);
      return NextResponse.json({ records });
    }

    // Lấy toàn bộ dữ liệu (hoặc lọc theo month/branch nhưng trả về format list/summary)
    const data = await getPnLData(month, branch);
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
    const body = await request.json();
    
    // Validate request body cho API mới
    // Bắt buộc phải truyền month, branch và records (Array)
    if (!body.month || !body.branch || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: 'Missing required fields: month, branch, or records array' },
        { status: 400 }
      );
    }
    
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
