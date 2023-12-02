// models/paper.js
const mongoose = require('mongoose');

const researchPaperSchema = new mongoose.Schema({
  name: String,
  fileLink: String,
});

const ResearchPaper = mongoose.model('ResearchPaper', researchPaperSchema);

module.exports = { ResearchPaper };