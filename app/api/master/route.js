import { NextResponse } from 'next/server';
import { getMasterData, addBranch, addCategory } from '@/lib/googleSheetsHelper';

export async function GET() {
  try {
    const data = await getMasterData();
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
