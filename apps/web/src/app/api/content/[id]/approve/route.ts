// ============================================
// StreamZ - Content Approve API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ContentApproveBodySchema } from '@streamz/shared';
import sql from '@/lib/db';

// ---- POST /api/content/[id]/approve ----
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contentId = params.id;

    // Validate content ID
    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body with Zod
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = ContentApproveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, description, tags, hashtags } = parsed.data;

    // Update the AI content record and mark as approved
    const [updated] = await sql`
      UPDATE ai_content
      SET
        title = ${title},
        description = ${description},
        tags = ${tags},
        hashtags = ${hashtags},
        review_status = 'approved'::review_status,
        edited = true
      WHERE id = ${contentId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[API /content/approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve content' },
      { status: 500 }
    );
  }
}
