import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';

export const generateSystemReport = async (reportTitle) => {
  // Find all elements marked as a section
  const sections = document.querySelectorAll('.pdf-section');

  if (!sections || sections.length === 0) {
    throw new Error("No sections found on the screen to capture.");
  }

  try {
    // 1. Initialize A4 PDF in millimeters
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Setup margins (15mm on all sides)
    const marginX = 15;
    const marginY = 15;
    const usableWidth = pdfWidth - (marginX * 2);
    
    let currentY = marginY;

    // 2. Loop through each section individually
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Take a high-res picture of JUST this section
      const imgData = await toJpeg(section, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2 // High resolution for sharp text
      });

      // Calculate how tall this section will be in the PDF
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

      // 3. SMART PAGINATION: Check if this section fits on the current page
      if (currentY + imgHeight > pdfHeight - marginY) {
        // It doesn't fit! Add a new page and reset the Y coordinate to the top
        pdf.addPage();
        currentY = marginY; 
      }

      // 4. Paste the section onto the PDF
      pdf.addImage(imgData, 'JPEG', marginX, currentY, usableWidth, imgHeight);

      // 5. Move our Y coordinate down slightly to add a gap between sections
      currentY += imgHeight + 10; 
    }

    // Save the perfectly formatted file
    const fileName = `Aksyon_Basura_${reportTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    throw new Error(error.message || "Failed to capture the report sections.");
  }
};