/**
 * Exports data to a CSV file that opens cleanly in Excel.
 * UTF-8 BOM is prepended so Excel renders special characters correctly.
 */
export const exportToExcel = (data, filename = 'SIWES_Export') => {
  if (!data || data.length === 0) return;

  // Explicit column order so the sheet is logical, not alphabetical
  const COLUMN_ORDER = [
    'Full Name',
    'Sex',
    'Phone Number',
    'Email Address',
    'School',
    'Course of Study',
    'Level',
    'Specialization',
    'Industry Dept',
    'Start Date',
    'End Date',
    'Duration',
    'Attendance Rate (%)',
    'Status',
  ];

  // Only include columns that actually exist in the data
  const headers = COLUMN_ORDER.filter(h => Object.prototype.hasOwnProperty.call(data[0], h));

  const escape = (val) => {
    const s = val !== null && val !== undefined ? String(val) : '';
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(row[h] ?? '')).join(',')),
  ];

  const BOM     = '\uFEFF';               // UTF-8 BOM – fixes Excel encoding
  const csv     = BOM + rows.join('\r\n');
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  const today   = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
