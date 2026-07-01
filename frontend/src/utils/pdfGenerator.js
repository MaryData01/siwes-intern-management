import { jsPDF } from 'jspdf';

export const exportInternReportCard = (data) => {
  const { profile, attendance } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let y = 15;

  // 1. HEADER BANNER (Deep Blue #1E3A8A)
  doc.setFillColor(30, 58, 138); // RGB for #1E3A8A
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("SIWES INDUSTRIAL TRAINING", margin, 18);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(191, 219, 254); // Blue 200
  doc.text("OFFICIAL PERFORMANCE EVALUATION REPORT CARD", margin, 25);
  
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Issued: ${reportDate}`, pageWidth - margin - 40, 25);
  
  y = 52;

  // 2. BIOGRAPHICAL SECTION
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text("INTERN BIODATA", margin, y);
  
  doc.setDrawColor(226, 232, 240); // Border slate-200
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 8;

  // Bio Info Grid
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  doc.text("Full Name:", margin, y);
  doc.text("Phone Number:", margin + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(profile.name, margin + 25, y);
  doc.text(profile.phone, margin + 115, y);
  
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("School:", margin, y);
  doc.text("Course of Study:", margin + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(profile.school, margin + 25, y);
  doc.text(profile.course_of_study, margin + 115, y);
  
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Specialization:", margin, y);
  doc.text("Industry Dept:", margin + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(profile.specialization, margin + 27, y);
  doc.text(profile.industry_department, margin + 115, y);

  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Email Address:", margin, y);
  doc.text("Status:", margin + 85, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(profile.email_address || '—', margin + 27, y);
  doc.text(profile.is_active ? "Active" : "Deactivated", margin + 115, y);

  y += 15;

  // 3. ATTENDANCE METRICS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text("ATTENDANCE EVALUATION (THURSDAY LOGS)", margin, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 8;

  // Attendance Stat Cards
  doc.setFillColor(248, 250, 252); // Light background
  doc.rect(margin, y, contentWidth, 18, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Total Thursdays", margin + 5, y + 7);
  doc.text("Attended", margin + 45, y + 7);
  doc.text("Absent", margin + 85, y + 7);
  doc.text("Attendance Rate", margin + 125, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${attendance.total}`, margin + 5, y + 13);
  
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`${attendance.present}`, margin + 45, y + 13);
  
  doc.setTextColor(239, 68, 68); // Red
  doc.text(`${attendance.absent}`, margin + 85, y + 13);
  
  doc.setTextColor(attendance.percentage >= 75 ? 16 : 239, attendance.percentage >= 75 ? 185 : 68, attendance.percentage >= 75 ? 129 : 68);
  doc.text(`${attendance.percentage}%`, margin + 125, y + 13);

  y += 28;

  // 4. ATTENDANCE HISTORY LOGS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text("ATTENDANCE LOGS HISTORY", margin, y);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 8;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Thursday Date", margin + 5, y + 5);
  doc.text("Attendance Status", margin + 100, y + 5);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  if (attendance.records.length === 0) {
    doc.text("No attendance records logged for this intern.", margin + 5, y + 6);
    y += 12;
  } else {
    attendance.records.forEach((rec) => {
      // Draw grid line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);

      doc.text(rec.date, margin + 5, y + 4.5);
      doc.setFont("helvetica", "bold");
      if (rec.status === 'Present') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(rec.status, margin + 100, y + 4.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      y += 6.5;

      // Check height
      if (y > pageHeight - margin - 20) {
        doc.addPage();
        y = 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`SIWES Progress Report Card - Attendance Logs - ${profile.name}`, margin, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 10;
        
        // Re-draw table header on new page
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Thursday Date", margin + 5, y + 5);
        doc.text("Attendance Status", margin + 100, y + 5);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
      }
    });
  }

  // 5. SIGNATURE SECTION
  y += 15;
  if (y > pageHeight - margin - 30) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text("SIWES Industry Supervisor Signature:", margin, y + 10);
  doc.line(margin + 65, y + 10, margin + 120, y + 10);
  
  doc.text("Date:", margin + 130, y + 10);
  doc.line(margin + 140, y + 10, pageWidth - margin, y + 10);

  // Save the PDF
  const filename = `SIWES_Report_${profile.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
