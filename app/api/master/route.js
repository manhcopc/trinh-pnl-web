import { NextResponse } from 'next/server';
import { getMasterData, addBranch, addCategory } from '@/lib/googleSheetsHelper';
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
    const refresh = searchParams.get('refresh') === 'true';

    let data = await getMasterData(refresh);
    
    // --- DATA MASKING ---
    // If not Admin/Auditor, restrict the branches list to ONLY their branch
    const userRole = session.user?.role;
    const userBranch = session.user?.branch;
    
    if (userRole !== 'Admin' && userRole !== 'Auditor') {
      if (userBranch && userBranch !== 'All') {
        data = {
          ...data,
          branches: data.branches.filter(b => b === userBranch)
        };
      }
    }
    // --------------------
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading Master Data:', error);
    return NextResponse.json(
      { error: 'Failed to read Master Data', details: error.message },
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
    
    // Only Admin/Auditor can modify master data
    if (session.user?.role !== 'Admin' && session.user?.role !== 'Auditor') {
      return NextResponse.json({ error: 'Forbidden: Only Admins can modify master data' }, { status: 403 });
    }

    const { action, name, groupName } = await request.json();

    if (!action || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'addBranch') {
      const result = await addBranch(name);
      return NextResponse.json(result);
    } 
    
    if (action === 'addCategory') {
      if (!groupName) return NextResponse.json({ error: 'Missing groupName' }, { status: 400 });
      const result = await addCategory(name, groupName);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in Master POST API:', error);
    return NextResponse.json(
      { error: 'Failed to update Master Data', details: error.message },
      { status: 500 }
    );
  }
}
