/**
 * PDF Export Utility
 * Generates downloadable PDF files from crochet patterns
 */

import jsPDF from 'jspdf';
import { FormattedPattern } from '@/lib/crochet/pattern-generator';

interface PatternPDFData {
    title: string;
    description?: string;
    shape: string;
    dimensions: {
        totalRows: number;
        totalStitches: number;
        width?: number;
        height?: number;
    };
    colors: string[];
    formatted: FormattedPattern;
}

/**
 * Generate a PDF document from pattern data
 */
export function generatePatternPDF(pattern: PatternPDFData): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
            return true;
        }
        return false;
    };

    // Header
    doc.setFillColor(147, 51, 234); // Purple
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CrochetAI Pattern', margin, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Text-to-Reality Crochet Engine', margin, 28);

    yPosition = 50;

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(pattern.title, margin, yPosition);
    yPosition += 10;

    // Description
    if (pattern.description) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(pattern.description, contentWidth);
        doc.text(descLines, margin, yPosition);
        yPosition += descLines.length * 5 + 5;
    }

    // Pattern info box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const infoY = yPosition + 8;
    doc.text(`Shape: ${pattern.shape}`, margin + 5, infoY);
    doc.text(`Rows: ${pattern.dimensions.totalRows}`, margin + 50, infoY);
    doc.text(`Total Stitches: ~${pattern.dimensions.totalStitches}`, margin + 90, infoY);

    // Colors
    const colorY = infoY + 10;
    doc.text('Colors:', margin + 5, colorY);
    let colorX = margin + 25;
    pattern.colors.forEach((color) => {
        // Draw color swatch
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        doc.setFillColor(r, g, b);
        doc.rect(colorX, colorY - 3, 8, 5, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(colorX, colorY - 3, 8, 5, 'S');
        doc.text(color, colorX + 10, colorY);
        colorX += 35;
    });

    yPosition += 35;

    // Materials Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234);
    doc.text('Materials', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    pattern.formatted.materials.forEach((material) => {
        checkPageBreak(6);
        doc.text(`• ${material}`, margin + 5, yPosition);
        yPosition += 5;
    });
    yPosition += 5;

    // Abbreviations Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234);
    doc.text('Abbreviations', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Create abbreviation pairs
    const abbrs = pattern.formatted.abbreviations;
    for (let i = 0; i < abbrs.length; i += 3) {
        checkPageBreak(6);
        let xPos = margin + 5;
        for (let j = 0; j < 3 && i + j < abbrs.length; j++) {
            const abbr = abbrs[i + j];
            doc.setFont('helvetica', 'bold');
            doc.text(`${abbr.abbr}`, xPos, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(` = ${abbr.meaning}`, xPos + 8, yPosition);
            xPos += 55;
        }
        yPosition += 5;
    }
    yPosition += 5;

    // Instructions Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234);
    doc.text('Instructions', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    pattern.formatted.instructions.forEach((instruction) => {
        // Remove markdown bold markers for PDF
        const cleanInstruction = instruction.replace(/\*\*(.*?)\*\*/g, '$1');
        const lines = doc.splitTextToSize(cleanInstruction, contentWidth - 5);

        checkPageBreak(lines.length * 5 + 3);
        doc.text(lines, margin + 5, yPosition);
        yPosition += lines.length * 5 + 2;
    });
    yPosition += 5;

    // Notes Section
    if (pattern.formatted.notes.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 51, 234);
        doc.text('Notes', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        pattern.formatted.notes.forEach((note) => {
            const lines = doc.splitTextToSize(`• ${note}`, contentWidth - 5);
            checkPageBreak(lines.length * 4 + 2);
            doc.text(lines, margin + 5, yPosition);
            yPosition += lines.length * 4 + 1;
        });
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Generated by CrochetAI • Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    return doc;
}

/**
 * Download pattern as PDF
 */
export function downloadPatternPDF(pattern: PatternPDFData): void {
    const doc = generatePatternPDF(pattern);
    const filename = `${pattern.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pattern.pdf`;
    doc.save(filename);
}

/**
 * Generate PDF as Blob for preview/upload
 */
export function getPatternPDFBlob(pattern: PatternPDFData): Blob {
    const doc = generatePatternPDF(pattern);
    return doc.output('blob');
}
