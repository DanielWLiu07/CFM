import { NextRequest, NextResponse } from 'next/server';
import members from '../../../../backend/data/members.json';
import { getNext, getPrev } from '../../lib/ringNavigate';

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const direction = (
    searchParams.get('direction') ||
    searchParams.get('nav') ||
    ''
  ).toLowerCase();
  const cohort = searchParams.get('cohort') ?? undefined;
  const redirect = searchParams.get('redirect') === 'true';

  if (!url || (direction !== 'next' && direction !== 'prev')) {
    return NextResponse.json(
      { error: 'Missing url or direction parameter (use direction=prev|next)' },
      { status: 400 },
    );
  }

  const navigable = members.filter((m) => m.url && m.url !== '#');
  const member =
    direction === 'next'
      ? getNext(navigable, url, cohort)
      : getPrev(navigable, url, cohort);

  if (!member?.url) {
    return NextResponse.json({ error: 'Member not found in ring' }, { status: 404 });
  }

  if (redirect) {
    return NextResponse.redirect(member.url, 302);
  }

  return NextResponse.json({ member });
}
