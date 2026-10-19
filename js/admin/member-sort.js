export function compareMembers(a, b, order = 'newest') {
  const left = a[1], right = b[1];
  let comparison = 0;
  if (order === 'name') comparison = String(left.name || '').localeCompare(String(right.name || ''), 'ko');
  else if (order === 'email') comparison = String(left.email || '').localeCompare(String(right.email || ''), 'en');
  else if (order === 'visits') comparison = Number(right.visitCount || 0) - Number(left.visitCount || 0);
  else if (order === 'lastVisit') comparison = Number(right.lastVisitedAt || 0) - Number(left.lastVisitedAt || 0);
  else comparison = Number(right.createdAt || 0) - Number(left.createdAt || 0);
  return comparison || Number(right.createdAt || 0) - Number(left.createdAt || 0) || a[0].localeCompare(b[0]);
}
