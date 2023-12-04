const fs = require('fs');
const PDFParser = require('pdf-parse');

async function getDOIsFromPDF(pdfBuffer) {
    try {
        const data = await PDFParser(pdfBuffer);
        const textContent = data.text;

        // Regular expression to find strings starting with "doi:"
        const doiRegex = /\bdoi:[^\s]+/gi;
        const matches = textContent.match(doiRegex);

        if (matches && matches.length > 0) {
            // Extract the DOI strings (without "doi:")
            const dois = matches.map(match => match.replace(/doi:/i, '').trim());
            return dois;
        } else {
            return []; // No DOIs found in the PDF
        }
    } catch (error) {
        console.error('Error extracting DOIs from PDF:', error);
        return [];
    }
}

module.exports = { getDOIsFromPDF };
