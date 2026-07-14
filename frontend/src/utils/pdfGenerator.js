import { jsPDF } from 'jspdf';

export const exportInternReportCard = (data) => {
  const { profile: p, attendance: a } = data;
  const doc         = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW       = doc.internal.pageSize.getWidth();
  const pageH       = doc.internal.pageSize.getHeight();
  const margin      = 15;
  const contentW    = pageW - margin * 2;
  let y             = 15;

  // ── Header band
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 42, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('SIWES INDUSTRIAL TRAINING', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(191, 219, 254);
  doc.text('OFFICIAL PERFORMANCE EVALUATION REPORT', margin, 26);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const issued = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Issued: ${issued}`, pageW - margin - 52, 26);
  y = 52;

  // ── Section heading helper
  const sectionHead = (title) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(title, margin, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 9;
  };

  // ── BIODATA
  sectionHead('INTERN BIODATA');

  const bioRows = [
    ['Full Name:',        p.name   || '-',  'Phone Number:',   p.phone         || '-'],
    ['Sex:',              p.sex    || '-',  'Email Address:',  p.email_address || '-'],
    ['School:',           p.school || '-',  'Course of Study:', p.course_of_study || '-'],
    ['Level:',            p.level  || '-',  'Specialization:', p.specialization  || '-'],
    ['Industry Dept:',    p.industry_department || '-', 'Status:', p.is_active ? 'Active' : 'Deactivated'],
    ['Start Date:',       p.start_date || '-', 'End Date:',     p.end_date  || '-'],
    ['Duration:',         p.duration   || '-', '',              ''],
  ];

  bioRows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');   doc.setFontSize(9);   doc.setTextColor(71, 85, 105);
    doc.text(l1, margin, y);
    if (l2) doc.text(l2, margin + 90, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(String(v1).slice(0, 45), margin + 30, y);
    if (v2) doc.text(String(v2).slice(0, 40), margin + 118, y);
    y += 7;
  });

  y += 6;

  // ── ATTENDANCE SUMMARY
  sectionHead('ATTENDANCE EVALUATION (THURSDAY LOGS)');

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentW, 18, 'F');

  const cols = [
    ['Total Thursdays', String(a.total)],
    ['Attended',        String(a.present)],
    ['Absent',          String(a.absent)],
    ['Attendance Rate', `${a.percentage}%`],
  ];
  const colW = contentW / cols.length;
  cols.forEach(([label, val], i) => {
    const x = margin + i * colW + 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
    doc.text(label, x, y + 6);
    doc.setFontSize(11);
    const colour = label === 'Attended'
      ? [16, 185, 129]
      : label === 'Absent'
        ? [239, 68, 68]
        : label === 'Attendance Rate'
          ? (a.percentage >= 75 ? [16, 185, 129] : [239, 68, 68])
          : [15, 23, 42];
    doc.setTextColor(...colour);
    doc.text(val, x, y + 14);
  });
  y += 26;

  // ── ATTENDANCE HISTORY
  sectionHead('ATTENDANCE LOGS HISTORY');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Thursday Date', margin + 4, y + 5);
  doc.text('Attendance Status', margin + 100, y + 5);
  y += 7;

  if (a.records.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text('No attendance records logged.', margin + 4, y + 5);
    y += 12;
  } else {
    a.records.forEach(rec => {
      if (y > pageH - margin - 20) {
        doc.addPage(); y = 15;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
        doc.text('Thursday Date', margin + 4, y + 5);
        doc.text('Attendance Status', margin + 100, y + 5);
        y += 7;
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageW - margin, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(rec.date || '', margin + 4, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rec.status === 'Present' ? 16 : 239, rec.status === 'Present' ? 185 : 68, rec.status === 'Present' ? 129 : 68);
      doc.text(rec.status || '', margin + 100, y + 4.5);
      y += 6.5;
    });
  }

  // ── Signature line
  y += 14;
  if (y > pageH - margin - 25) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  doc.text('SIWES Industry Supervisor Signature:', margin, y + 8);
  doc.line(margin + 68, y + 8, margin + 120, y + 8);
  doc.text('Date:', margin + 130, y + 8);
  doc.line(margin + 140, y + 8, pageW - margin, y + 8);

  doc.save(`SIWES_Report_${(p.name || 'Intern').replace(/\s+/g, '_')}.pdf`);
};
