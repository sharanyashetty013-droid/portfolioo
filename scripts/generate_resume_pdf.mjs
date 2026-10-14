import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateResume() {
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 48;
  const contentWidth = width - margin * 2;
  let y = height - 52;

  // Header Title
  page.drawText('SHARANYA L SHETTY', {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.08),
  });

  y -= 18;
  page.drawText('B.Tech, Computer Science Engineering (2nd Year) • NMAM Institute of Technology, Nitte', {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 14;
  page.drawText('8762483622 • sharanyashetty013@gmail.com • Karkala, Udupi, Karnataka', {
    x: margin,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 16;

  function drawSectionHeader(title) {
    y -= 6;
    page.drawText(title, {
      x: margin,
      y,
      size: 10.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: rgb(0.25, 0.25, 0.25),
    });
    y -= 13;
  }

  function drawBullet(text, indent = 0) {
    const bulletX = margin + indent;
    const textX = bulletX + 11;
    page.drawText('•', {
      x: bulletX,
      y: y + 0.5,
      size: 10,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const words = text.split(' ');
    let line = '';
    const maxW = contentWidth - indent - 11;
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const testW = fontRegular.widthOfTextAtSize(testLine, 9.5);
      if (testW > maxW) {
        page.drawText(line, {
          x: textX,
          y,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 13;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, {
        x: textX,
        y,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= 14;
    }
  }

  // 1. PROFILE
  drawSectionHeader('PROFILE');
  const profileText = 'Second-year CSE student with a focus on Backend and Blockchain (Solidity). Core member of two campus communities, coordinating logistics and documentation for club activities while building technical skills through certifications, hackathons and internships. Comfortable presenting to groups, organizing people around a shared goal, and picking up new tools quickly.';
  const pWords = profileText.split(' ');
  let pLine = '';
  for (const word of pWords) {
    const test = pLine + (pLine ? ' ' : '') + word;
    if (fontRegular.widthOfTextAtSize(test, 9.5) > contentWidth) {
      page.drawText(pLine, { x: margin, y, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 13;
      pLine = word;
    } else {
      pLine = test;
    }
  }
  if (pLine) {
    page.drawText(pLine, { x: margin, y, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    y -= 14;
  }

  // 2. EDUCATION
  drawSectionHeader('EDUCATION');
  page.drawText('NMAM Institute of Technology, Nitte', {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  const date1 = '2025 – 2029';
  const d1W = fontRegular.widthOfTextAtSize(date1, 9.5);
  page.drawText(date1, {
    x: width - margin - d1W,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 13;
  page.drawText('B.Tech, Computer Science Engineering • CGPA 9.36 (1st Year)', {
    x: margin,
    y,
    size: 9.5,
    font: fontOblique,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 15;

  page.drawText('Creative PU College, Karkala, Udupi', {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  const date2 = '2023 – 2025';
  const d2W = fontRegular.widthOfTextAtSize(date2, 9.5);
  page.drawText(date2, {
    x: width - margin - d2W,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 13;
  page.drawText('Pre-University Course, Science • 95% in Board Examinations', {
    x: margin,
    y,
    size: 9.5,
    font: fontOblique,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 14;

  // 3. LEADERSHIP & CAMPUS INVOLVEMENT
  drawSectionHeader('LEADERSHIP & CAMPUS INVOLVEMENT');
  drawBullet('TIPTOE Club – Core Member; received recognition for contributions to club activities and events');
  drawBullet('ACM Club – Core Member, Documentation Team');
  drawBullet('Supported registration and data tracking for club events using Google Forms and Sheets');

  // 4. EXPERIENCE
  drawSectionHeader('EXPERIENCE');
  drawBullet('Completed two off-campus internships and one campus internship');
  drawBullet('Participated in multiple ideathons and datathons as part of cross-functional teams');

  // 5. CERTIFICATIONS
  drawSectionHeader('CERTIFICATIONS');
  drawBullet('Google Certification');
  drawBullet('Microsoft Certification');

  // 6. ACHIEVEMENTS & AWARDS
  drawSectionHeader('ACHIEVEMENTS & AWARDS');
  drawBullet('Best Student Award');
  drawBullet('Best Librarian Award, 12th Grade');
  drawBullet('Secured 95% in 12th Board Examinations');
  drawBullet('Recognition and prizes across TIPTOE Club and off-campus activities');

  // 7. CORE SKILLS
  drawSectionHeader('CORE SKILLS');
  const skillsLine1 = 'Communication & Public Speaking • Backend • DSA • Blockchain and Solidity • Go, Docker • Tailwind CSS';
  const skillsLine2 = '• API and Next.js';
  page.drawText(skillsLine1, {
    x: margin,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 13;
  page.drawText(skillsLine2, {
    x: margin,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.15, 0.15, 0.15),
  });

  const pdfBytes = await pdfDoc.save();
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPath = path.join(publicDir, 'resume.pdf');
  fs.writeFileSync(publicPath, pdfBytes);
  console.log(`Successfully generated official resume PDF at ${publicPath} (${pdfBytes.length} bytes)`);
}

generateResume().catch(console.error);
