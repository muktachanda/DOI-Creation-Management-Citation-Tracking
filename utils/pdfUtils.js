const fs = require('fs');
require('dotenv').config();
const { promisify } = require('util');
const unzipper = require('unzipper');
const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const unlinkAsync = promisify(fs.unlink);
const fse = require('fs-extra');

async function getDOIsFromPDF(pdfPath) {
  try {
    // Initialize credentials
    const credentials = PDFServicesSdk.Credentials
      .servicePrincipalCredentialsBuilder()
      .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
      .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
      .build();

    // Create execution context
    const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

    // Build extractPDF options to extract text
    const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
      .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
      .build();

    // Create operation to extract text
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();
    const input = PDFServicesSdk.FileRef.createFromLocalFile(
      pdfPath,
      PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    // Set operation input
    extractPDFOperation.setInput(input);

    // Set options
    extractPDFOperation.setOptions(options);

    // Execute the operation and save the result to a text file
    const outputFilePath = 'temp_textzipped';
    await extractPDFOperation.execute(executionContext)
      .then(result => result.saveAsFile(outputFilePath))
      .catch(err => {
        if (err instanceof PDFServicesSdk.Error.ServiceApiError
          || err instanceof PDFServicesSdk.Error.ServiceUsageError) {
          console.log('Exception encountered while executing operation', err);
        } else {
          console.log('Exception encountered while executing operation', err);
        }
      });

      const unzippedPath = 'temp_text';
      await unzipTextFile('temp_textzipped.zip', unzippedPath);

    // Extract DOIs from the saved text file
    const dois = extractDOIsFromFile(unzippedPath + '/structuredData.json');

    // Debug: Print matched DOIs
    console.log('Matched DOIs:', dois);

    // Delete the temporary text file
    await Promise.all([
        unlinkAsync('temp_textzipped.zip'),
        fse.remove('temp_text')
      ]);

    return dois;
  } catch (err) {
    console.error('Error extracting DOI from PDF:', err);
    return [];
  }
}

async function unzipTextFile(zipPath, outputPath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputPath }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

function extractDOIsFromFile(filePath) {
  try {
    // Read the content of the file
    const dataBuffer = fs.readFileSync(filePath);
    const data = dataBuffer.toString();

    // Extract DOIs from the text
    const doiRegex = /\bdoi:\S+/gi;
    const matches = data.match(doiRegex) || [];
    return matches;
  } catch (err) {
    console.error('Error extracting DOI from file:', err);
    return [];
  }
}

module.exports = { getDOIsFromPDF };